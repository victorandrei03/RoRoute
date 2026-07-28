from typing import Dict, List, Optional


class TourismService:
    def __init__(self):
        self.feature_server_url = "https://services-eu1.arcgis.com/zci5bUiJ8olAal7N/arcgis/rest/services/OSM_EU_Tourism/FeatureServer/0"

        # Accommodation types to exclude
        self.accommodation_types = [
            'apartment', 'camp_pitch', 'camp_site', 'caravan_site',
            'chalet', 'guest_house', 'hostel', 'hotel', 'motel',
            'trail_riding_station'
        ]

    def build_definition_expression(self, tourism_type: Optional[str] = None) -> str:
        # Base filter: exclude accommodations and require name
        accommodation_filter = f"tourism NOT IN ({', '.join(repr(t) for t in self.accommodation_types)})"
        base_expression = f"name IS NOT NULL AND {accommodation_filter}"

        # Add specific tourism type filter if provided
        if tourism_type and tourism_type.lower() != 'all':
            return f"{base_expression} AND tourism = '{tourism_type}'"

        return base_expression

    def get_filter_config(self) -> Dict:
        return {
            'feature_server_url': self.feature_server_url,
            'layer_id': 0,
            'excluded_types': self.accommodation_types,
            'filter_options': [
                {'value': 'all', 'label': 'All Attractions'},
                {'value': 'museum', 'label': 'Museums'},
                {'value': 'attraction', 'label': 'Tourist Attractions'},
                {'value': 'viewpoint', 'label': 'Viewpoints'},
                {'value': 'artwork', 'label': 'Artwork'},
                {'value': 'gallery', 'label': 'Galleries'},
                {'value': 'theme_park', 'label': 'Theme Parks'},
                {'value': 'zoo', 'label': 'Zoos'},
                {'value': 'aquarium', 'label': 'Aquariums'},
                {'value': 'picnic_site', 'label': 'Picnic Sites'}
            ]
        }

    def get_layer_info(self) -> Dict:
        return {
            'url': self.feature_server_url,
            'title': 'Tourist Attractions (Romania)',
            'out_fields': [
                'name', 'tourism', 'historic', 'amenity',
                'description', 'opening_hours', 'website', 'phone'
            ],
            'popup_template': {
                'title': '{name}',
                'content': [
                    {'type': 'fields', 'fieldInfos': [
                        {'fieldName': 'tourism', 'label': 'Type'},
                        {'fieldName': 'historic', 'label': 'Historic'},
                        {'fieldName': 'description', 'label': 'Description'},
                        {'fieldName': 'opening_hours', 'label': 'Opening Hours'},
                        {'fieldName': 'website', 'label': 'Website'},
                        {'fieldName': 'phone', 'label': 'Phone'}
                    ]}
                ]
            }
        }
