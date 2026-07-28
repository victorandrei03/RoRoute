import math
from typing import List, Dict, Optional

class RouteOptimizer:
    def __init__(self):
        self.earth_radius_km = 6371

    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = math.sin(delta_lat / 2) ** 2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * \
            math.sin(delta_lon / 2) ** 2

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = self.earth_radius_km * c

        return distance

    def calculate_optimal_route(self, attractions: List[Dict], start_location: Dict = None) -> Dict:
        if not attractions:
            return {
                'route': [],
                'total_distance': 0,
                'segments': [],
                'start_location': start_location,
                'algorithm': 'nearest_neighbor'
            }
        
        if start_location:
            current_lat = start_location['latitude']
            current_lon = start_location['longitude']

        if len(attractions) == 1:
            # Single attraction case
            distance_from_start = 0
            segments = []

            if start_location:
                distance_from_start = self.calculate_distance(
                    start_location['latitude'],
                    start_location['longitude'],
                    attractions[0]['latitude'],
                    attractions[0]['longitude']
                )
                segments.append({
                    'from': start_location['name'],
                    'to': attractions[0]['name'],
                    'distance_km': round(distance_from_start, 2)
                })

            return {
                'route': attractions,
                'total_distance': round(distance_from_start, 2),
                'segments': segments,
                'start_location': start_location,
                'algorithm': 'nearest_neighbor'
            }

        # Use starting location if provided, otherwise start from first attraction
        unvisited = list(range(len(attractions)))
        route_order = []
        total_distance = 0
        segments = []

        # Determine first attraction from start location
        if start_location:
            current_lat = start_location['latitude']
            current_lon = start_location['longitude']
            current_name = start_location['name']
        else:
            # Start from first attraction
            current_lat = attractions[0]['latitude']
            current_lon = attractions[0]['longitude']
            current_name = attractions[0]['name']
            route_order.append(0)
            unvisited.remove(0)

        # Visit nearest unvisited attraction at each step
        while unvisited:
            nearest_idx = None
            nearest_distance = float('inf')

            # Find nearest unvisited attraction
            for idx in unvisited:
                candidate = attractions[idx]
                distance = self.calculate_distance(
                    current_lat,
                    current_lon,
                    candidate['latitude'],
                    candidate['longitude']
                )

                if distance < nearest_distance:
                    nearest_distance = distance
                    nearest_idx = idx

            # Move to nearest attraction
            nearest_attraction = attractions[nearest_idx]
            segments.append({
                'from': current_name,
                'to': nearest_attraction['name'],
                'distance_km': round(nearest_distance, 2)
            })

            route_order.append(nearest_idx)
            total_distance += nearest_distance

            # Update current position
            current_lat = nearest_attraction['latitude']
            current_lon = nearest_attraction['longitude']
            current_name = nearest_attraction['name']

            unvisited.remove(nearest_idx)

        # Build ordered route
        ordered_route = [attractions[idx] for idx in route_order]

        # Apply 2-Opt optimization to improve the route
        optimized_route = self.two_opt_optimize(ordered_route, start_location)

        # Recalculate distance and segments for optimized route
        total_distance = 0
        segments = []

        if start_location:
            current_lat = start_location['latitude']
            current_lon = start_location['longitude']
            current_name = start_location['name']
        else:
            current_lat = optimized_route[0]['latitude']
            current_lon = optimized_route[0]['longitude']
            current_name = optimized_route[0]['name']

        start_idx = 0 if start_location else 1

        for attraction in optimized_route[start_idx:]:
            distance = self.calculate_distance(
                current_lat,
                current_lon,
                attraction['latitude'],
                attraction['longitude']
            )
            segments.append({
                'from': current_name,
                'to': attraction['name'],
                'distance_km': round(distance, 2)
            })
            total_distance += distance
            current_lat = attraction['latitude']
            current_lon = attraction['longitude']
            current_name = attraction['name']

        return {
            'route': optimized_route,
            'total_distance': round(total_distance, 2),
            'segments': segments,
            'start_location': start_location,
            'algorithm': 'nearest_neighbor_with_2opt'
        }

    def two_opt_optimize(self, route: List[Dict], start_location: Dict = None) -> List[Dict]:
        if len(route) <= 2:
            return route

        route = list(route)  # Make a copy to avoid modifying original
        improved = True

        while improved:
            improved = False

            for i in range(len(route) - 1):
                for j in range(i + 2, len(route)):
                    # Calculate distance of current edge pair
                    # Edge 1: from point before i to point i
                    if i == 0 and start_location:
                        edge1_start_lat = start_location['latitude']
                        edge1_start_lon = start_location['longitude']
                    elif i == 0:
                        # Skip if no start location and i=0 (no previous point)
                        continue
                    else:
                        edge1_start_lat = route[i - 1]['latitude']
                        edge1_start_lon = route[i - 1]['longitude']

                    edge1_end_lat = route[i]['latitude']
                    edge1_end_lon = route[i]['longitude']

                    # Edge 2: from point j to point after j (if exists)
                    if j == len(route) - 1:
                        # Skip if j is last point (no next point)
                        continue

                    edge2_start_lat = route[j]['latitude']
                    edge2_start_lon = route[j]['longitude']
                    edge2_end_lat = route[j + 1]['latitude']
                    edge2_end_lon = route[j + 1]['longitude']

                    # Calculate current distance
                    current_distance = (
                        self.calculate_distance(edge1_start_lat, edge1_start_lon, edge1_end_lat, edge1_end_lon) +
                        self.calculate_distance(edge2_start_lat, edge2_start_lon, edge2_end_lat, edge2_end_lon)
                    )

                    # Calculate distance after reversing segment between i and j
                    new_distance = (
                        self.calculate_distance(edge1_start_lat, edge1_start_lon, edge2_start_lat, edge2_start_lon) +
                        self.calculate_distance(edge1_end_lat, edge1_end_lon, edge2_end_lat, edge2_end_lon)
                    )

                    # If new distance is better, reverse the segment
                    if new_distance < current_distance:
                        route[i:j + 1] = reversed(route[i:j + 1])
                        improved = True
                        break

                if improved:
                    break

        return route

    def calculate_route_geometry(self, route: List[Dict], start_location: Dict = None) -> List[List[float]]:
        geometry = []

        # Add start location if provided
        if start_location:
            geometry.append([start_location['longitude'], start_location['latitude']])

        # Add all attractions in route order
        for attraction in route:
            geometry.append([attraction['longitude'], attraction['latitude']])

        return geometry
