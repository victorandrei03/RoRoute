import requests
from typing import List, Dict

class ArcGISRouteService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or "AAPTxy8BH1VEsoebNVZXo8HurDPKAq3VaV_xrgUjYre1Pnmwp3O85BVX3fDDKZ1H__qI1kee4d-W5Ai2SSeMCpqWYRpFR_d8YiiRVtGr3WsfTNvUVcuwbnsI6TS9yWTu4Anah6wZlYP73GrnQy_GXhHmnB8lt3sfcc7MpN_MRzvanQ2WjNrxKnBnCuc9DW250fAPPtSyHx31yUN9T5Dh2wlE-DRhGh7RJRYnBBD6IHRhxiY.AT1_4BxOT2Pv"
        self.route_url = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve"

    def calculate_optimal_route(self, attractions: List[Dict], start_location: Dict = None) -> Dict:
        if not attractions:
            return {
                'route': [],
                'total_distance': 0,
                'segments': [],
                'start_location': start_location,
                'algorithm': 'arcgis',
                'error': 'No attractions provided'
            }

        try:
            # Build stops as features
            stops = []

            # Add start location as first stop if provided
            if start_location:
                stops.append({
                    'geometry': {
                        'x': start_location['longitude'],
                        'y': start_location['latitude']
                    },
                    'attributes': {
                        'Name': start_location['name']
                    }
                })

            # Add all attractions as stops
            for idx, attraction in enumerate(attractions):
                stops.append({
                    'geometry': {
                        'x': attraction['longitude'],
                        'y': attraction['latitude']
                    },
                    'attributes': {
                        'Name': attraction['name']
                    }
                })

            # Format stops as JSON string
            import json
            stops_json = json.dumps({
                'features': stops
            })

            # Prepare request parameters
            params = {
                'f': 'json',
                'token': self.api_key,
                'stops': stops_json,
                'returnDirections': 'true',
                'returnRoutes': 'true',
                'returnStops': 'true',
                'findBestSequence': 'true',  # Optimize route order
                'preserveFirstStop': 'true',  # Keep start location first
                'preserveLastStop': 'false',
                'directionsLengthUnits': 'esriNAUKilometers',
                'outSR': '4326'  # WGS84 coordinate system
            }

            # Make API request
            response = requests.post(self.route_url, data=params, timeout=30)
            response.raise_for_status()

            result = response.json()

            # Check for errors in response
            if 'error' in result:
                error_msg = result['error'].get('message', 'Unknown ArcGIS error')
                return {
                    'route': attractions,
                    'total_distance': 0,
                    'segments': [],
                    'start_location': start_location,
                    'algorithm': 'arcgis',
                    'error': error_msg
                }

            # Parse the response
            return self._parse_arcgis_response(result, attractions, start_location)

        except requests.exceptions.RequestException as e:
            # Network or API error
            return {
                'route': attractions,
                'total_distance': 0,
                'segments': [],
                'start_location': start_location,
                'algorithm': 'arcgis',
                'error': f'ArcGIS API request failed: {str(e)}'
            }
        except Exception as e:
            return {
                'route': attractions,
                'total_distance': 0,
                'segments': [],
                'start_location': start_location,
                'algorithm': 'arcgis',
                'error': f'Unexpected error: {str(e)}'
            }

    def _parse_arcgis_response(self, result: Dict, original_attractions: List[Dict], start_location: Dict = None) -> Dict:
        try:
            # Extract route feature
            routes = result.get('routes', {}).get('features', [])
            if not routes:
                raise ValueError('No routes found in response')

            route_feature = routes[0]
            route_attributes = route_feature.get('attributes', {})

            # Total distance in kilometers
            total_distance = route_attributes.get('Total_Kilometers', 0)

            # Get ordered stops from response
            stops = result.get('stops', {}).get('features', [])
            ordered_stops = sorted(stops, key=lambda x: x['attributes'].get('Sequence', 0))

            # Build route in correct order (skip start location if present)
            ordered_route = []
            start_idx = 1 if start_location else 0

            for stop in ordered_stops[start_idx:]:
                stop_name = stop['attributes'].get('Name', '')

                # Find matching attraction
                for attraction in original_attractions:
                    if attraction['name'] == stop_name:
                        ordered_route.append(attraction)
                        break

            # Extract directions for segments
            segments = []
            directions = result.get('directions', [])

            if directions and len(directions) > 0:
                direction_features = directions[0].get('features', [])

                for direction in direction_features:
                    attrs = direction.get('attributes', {})
                    text = attrs.get('text', '')
                    length_km = attrs.get('length', 0)

                    if text and length_km > 0:
                        segments.append({
                            'description': text,
                            'distance_km': round(length_km, 2)
                        })

            # If no detailed segments, create simple segments
            if not segments and len(ordered_route) > 0:
                prev_name = start_location['name'] if start_location else ordered_route[0]['name']
                start_offset = 0 if start_location else 1

                for attraction in ordered_route[start_offset:]:
                    segments.append({
                        'from': prev_name,
                        'to': attraction['name'],
                        'distance_km': 0  # Unknown without detailed directions
                    })
                    prev_name = attraction['name']

            # Extract route geometry
            route_geometry = route_feature.get('geometry', {})

            return {
                'route': ordered_route,
                'total_distance': round(total_distance, 2),
                'segments': segments,
                'start_location': start_location,
                'algorithm': 'arcgis',
                'route_geometry': route_geometry
            }

        except Exception as e:
            # Parsing error - return original attractions
            return {
                'route': original_attractions,
                'total_distance': 0,
                'segments': [],
                'start_location': start_location,
                'algorithm': 'arcgis',
                'error': f'Failed to parse ArcGIS response: {str(e)}'
            }
