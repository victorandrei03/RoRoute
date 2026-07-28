from flask import Flask, request, jsonify
from flask_cors import CORS
from services.firebase_service import FirebaseService
from services.auth_service import AuthService
from services.route_optimizer import RouteOptimizer
from services.arcgis_service import ArcGISRouteService
from services.tourism_service import TourismService
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

fb_service = FirebaseService()
auth_service = AuthService()
route_optimizer = RouteOptimizer()
arcgis_service = ArcGISRouteService()
tourism_service = TourismService()

# ============= AUTH ENDPOINTS =============

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        required_fields = ['email', 'password']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing email or password'}), 400

        # Get user by email
        user_data = fb_service.get_user_by_email(data['email'])
        if not user_data:
            return jsonify({'error': 'Invalid email or password'}), 401

        user_id = user_data.get('user_id')
        stored_password = user_data.get('password')

        # Verify password
        if not auth_service.verify_password(data['password'], stored_password):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Generate JWT token
        token = auth_service.generate_token(user_id, data['email'])

        # Return user data without password
        user_data.pop('password', None)

        return jsonify({
            'token': token,
            'user': user_data,
            'message': 'Login successful'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/auth/verify', methods=['GET'])
@auth_service.require_auth
def verify_token():
    return jsonify({
        'valid': True,
        'user_id': request.user_id,
        'email': request.user_email
    }), 200

# ============= USERS ENDPOINTS =============

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.json
        required_fields = ['username', 'email', 'password']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if email already exists
        existing_user = fb_service.get_user_by_email(data['email'])
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400

        # Hash password before storing
        data['password'] = auth_service.hash_password(data['password'])
        data['created'] = datetime.now().isoformat()

        user_id = fb_service.create_user(data)

        # Generate token for auto-login after registration
        token = auth_service.generate_token(user_id, data['email'])

        return jsonify({
            'user_id': user_id,
            'token': token,
            'message': 'User created successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = fb_service.get_user(user_id)
        if user:
            # Don't send password to client
            user.pop('password', None)
            user['user_id'] = user_id
            return jsonify(user), 200
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = request.json
        data['updated'] = datetime.now().isoformat()

        fb_service.update_user(user_id, data)
        return jsonify({'message': 'User updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= CITIES ENDPOINTS =============

@app.route('/api/cities', methods=['GET'])
def get_cities():
    try:
        cities = fb_service.get_cities()
        return jsonify(cities), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cities/<city_id>', methods=['GET'])
def get_city(city_id):
    try:
        city = fb_service.get_city(city_id)
        if city:
            return jsonify(city), 200
        return jsonify({'error': 'City not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cities', methods=['POST'])
def create_city():
    try:
        data = request.json
        required_fields = ['name']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        data['created'] = datetime.now().isoformat()
        city_id = fb_service.create_city(data)

        return jsonify({'city_id': city_id, 'message': 'City created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= ATTRACTIONS ENDPOINTS =============

@app.route('/api/attractions', methods=['GET'])
def get_attractions():
    city_id = request.args.get('city_id')
    attraction_type = request.args.get('type')

    try:
        attractions = fb_service.get_attractions(city_id=city_id, attraction_type=attraction_type)
        return jsonify(attractions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attractions/<attraction_id>', methods=['GET'])
def get_attraction(attraction_id):
    try:
        attraction = fb_service.get_attraction(attraction_id)
        if attraction:
            return jsonify(attraction), 200
        return jsonify({'error': 'Attraction not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attractions', methods=['POST'])
def create_attraction():
    try:
        data = request.json
        required_fields = ['name', 'description', 'type', 'location', 'city_id']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        data['created'] = datetime.now().isoformat()
        attraction_id = fb_service.create_attraction(data)

        return jsonify({'attraction_id': attraction_id, 'message': 'Attraction created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attractions/<attraction_id>', methods=['PUT'])
def update_attraction(attraction_id):
    try:
        data = request.json
        data['updated'] = datetime.now().isoformat()

        fb_service.update_attraction(attraction_id, data)
        return jsonify({'message': 'Attraction updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attractions/<attraction_id>', methods=['DELETE'])
def delete_attraction(attraction_id):
    try:
        fb_service.delete_attraction(attraction_id)
        return jsonify({'message': 'Attraction deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= REVIEWS ENDPOINTS =============

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    attraction_id = request.args.get('attraction_id')
    itinerary_id = request.args.get('itinerary_id')
    user_id = request.args.get('user_id')
    
    action = request.args.get('action')

    try:
        if (attraction_id or itinerary_id) and action == 'rating':
            rating_data = fb_service.calculate_average_rating(attraction_id=attraction_id, itinerary_id=itinerary_id)
            return jsonify(rating_data), 200

        reviews = fb_service.get_reviews(attraction_id=attraction_id, itinerary_id=itinerary_id, user_id=user_id)

        for review in reviews:
            user_data = fb_service.get_user(review.get('user_id'))
            review['userName'] = user_data.get('username', 'Anonymous') if user_data else 'Unknown User'

        return jsonify(reviews), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/<review_id>', methods=['GET'])
def get_review(review_id):
    try:
        review = fb_service.get_review(review_id)
        if review:
            return jsonify(review), 200
        return jsonify({'error': 'Review not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews', methods=['POST'])
@auth_service.require_auth
def create_review():
    try:
        data = request.json
        required_fields = ['user_id', 'rating', 'comment']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        if not (1 <= data['rating'] <= 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400

        if not data.get('attraction_id') and not data.get('itinerary_id'):
            return jsonify({'error': 'Missing attraction_id or itinerary_id'}), 400
        if request.user_id != data['user_id']:
             return jsonify({'error': 'Authorization mismatch'}), 403

        data['created'] = datetime.now().isoformat()
        
        user_data = fb_service.get_user(data['user_id'])
        data['userName'] = user_data.get('username', 'Anonymous') if user_data else 'Unknown User'

        review_id = fb_service.create_review(data)
        if data.get('itinerary_id'):
            fb_service.update_itinerary_rating(data.get('itinerary_id'))

        return jsonify({'review_id': review_id, 'message': 'Review created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/<review_id>', methods=['PUT'])
def update_review(review_id):
    try:
        existing_review = fb_service.get_review(review_id)
        if not existing_review:
            return jsonify({'error': 'Review not found'}), 404

        data = request.json
        data['updated'] = datetime.now().isoformat()

        # Validate rating if provided
        if 'rating' in data and not (1 <= data['rating'] <= 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400

        fb_service.update_review(review_id, data)
        itinerary_id = existing_review.get('itinerary_id')
        if itinerary_id:
            fb_service.update_itinerary_rating(itinerary_id)
        return jsonify({'message': 'Review updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/<review_id>', methods=['DELETE'])
def delete_review(review_id):
    try:
        existing_review = fb_service.get_review(review_id)
        if not existing_review:
            return jsonify({'error': 'Review not found'}), 404
        fb_service.delete_review(review_id)
        itinerary_id = existing_review.get('itinerary_id')
        if itinerary_id:
            fb_service.update_itinerary_rating(itinerary_id)
        return jsonify({'message': 'Review deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= ITINERARIES ENDPOINTS =============

@app.route('/api/itineraries', methods=['GET'])
def get_itineraries():
    user_id = request.args.get('userId')
    limit = int(request.args.get('limit', 20))
    posted = request.args.get('posted')
    posted_filter = None
    if posted is not None:
        posted_filter = posted.lower() == 'true'

    try:
        itineraries = fb_service.get_itineraries(limit=limit, user_id=user_id, posted=posted_filter)
        return jsonify(itineraries), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/itineraries/<itinerary_id>', methods=['GET'])
def get_itinerary(itinerary_id):
    try:
        itinerary = fb_service.get_itinerary(itinerary_id)
        if itinerary:
            # Increment views
            fb_service.increment_views(itinerary_id)
            return jsonify(itinerary), 200
        return jsonify({'error': 'Itinerary not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/itineraries', methods=['POST'])
def create_itinerary():
    try:
        data = request.json
        required_fields = ['title', 'description', 'attractions', 'userId', 'userName']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Initialize metadata
        data['created'] = datetime.now().isoformat()
        data['likes'] = 0
        data['views'] = 0
        data['posted'] = data.get('posted', False)
        data['ratingAverage'] = data.get('ratingAverage', 0)
        data['ratingCount'] = data.get('ratingCount', 0)

        itinerary_id = fb_service.create_itinerary(data)

        return jsonify({'id': itinerary_id, 'message': 'Itinerary created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/itineraries/<itinerary_id>', methods=['PUT'])
def update_itinerary(itinerary_id):
    try:
        data = request.json
        data['updated'] = datetime.now().isoformat()

        fb_service.update_itinerary(itinerary_id, data)
        return jsonify({'message': 'Itinerary updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/itineraries/<itinerary_id>', methods=['DELETE'])
def delete_itinerary(itinerary_id):
    try:
        fb_service.delete_itinerary(itinerary_id)
        return jsonify({'message': 'Itinerary deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/itineraries/<itinerary_id>/like', methods=['POST'])
def like_itinerary(itinerary_id):
    try:
        success = fb_service.increment_likes(itinerary_id)
        if success:
            return jsonify({'message': 'Itinerary liked'}), 200
        return jsonify({'error': 'Itinerary not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= ROUTE CALCULATION ENDPOINTS =============

@app.route('/api/routes/calculate', methods=['POST'])
def calculate_route():
    try:
        data = request.json
        required_fields = ['attractions']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        attractions = data['attractions']
        start_location = data.get('start_location')

        if not attractions or len(attractions) == 0:
            return jsonify({'error': 'No attractions provided'}), 400

        # Calculate route using custom algorithm
        custom_route = route_optimizer.calculate_optimal_route(attractions, start_location)

        # Calculate route geometry
        route_geometry = route_optimizer.calculate_route_geometry(custom_route['route'], start_location)
        custom_route['route_geometry'] = route_geometry

        return jsonify(custom_route), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/routes/compare', methods=['POST'])
def compare_routes():
    try:
        data = request.json
        required_fields = ['attractions']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        attractions = data['attractions']
        start_location = data.get('start_location')

        if not attractions or len(attractions) == 0:
            return jsonify({'error': 'No attractions provided'}), 400

        # Calculate route using custom algorithm
        custom_route = route_optimizer.calculate_optimal_route(attractions, start_location)
        custom_route['route_geometry'] = route_optimizer.calculate_route_geometry(custom_route['route'], start_location)

        # Calculate route using ArcGIS (if available)
        arcgis_route = arcgis_service.calculate_optimal_route(attractions, start_location)

        return jsonify({
            'custom_route': custom_route,
            'arcgis_route': arcgis_route
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attractions/search', methods=['GET'])
def search_attractions():
    try:
        search_query = request.args.get('q', '').lower()
        city_id = request.args.get('city_id')
        limit = int(request.args.get('limit', 50))

        # Get all attractions with optional city filter
        attractions = fb_service.get_attractions(city_id=city_id)

        # Filter by search query if provided
        if search_query:
            filtered_attractions = []
            for attr_id, attr_data in attractions.items():
                attr_name = attr_data.get('name', '').lower()
                attr_city = attr_data.get('city', '').lower()
                attr_region = attr_data.get('region', '').lower()

                if (search_query in attr_name or
                    search_query in attr_city or
                    search_query in attr_region):
                    filtered_attractions.append({
                        'id': attr_id,
                        **attr_data
                    })

            # Limit results
            filtered_attractions = filtered_attractions[:limit]
            return jsonify(filtered_attractions), 200

        # Return all (limited)
        result = []
        for attr_id, attr_data in list(attractions.items())[:limit]:
            result.append({
                'id': attr_id,
                **attr_data
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= TOURISM ENDPOINTS =============

@app.route('/api/tourism/config', methods=['GET'])
def get_tourism_config():
    try:
        config = tourism_service.get_filter_config()
        return jsonify(config), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tourism/layer-info', methods=['GET'])
def get_tourism_layer_info():
    try:
        layer_info = tourism_service.get_layer_info()
        return jsonify(layer_info), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tourism/filter', methods=['GET'])
def get_tourism_filter():
    try:
        tourism_type = request.args.get('type', 'all')
        definition_expression = tourism_service.build_definition_expression(tourism_type)

        return jsonify({
            'definition_expression': definition_expression,
            'tourism_type': tourism_type
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# ============= SURVEY ENDPOINTS =============

@app.route('/api/survey/preferences', methods=['POST'])
@auth_service.require_auth
def submit_preferences():
    try:
        data = request.json
        # user_id is already available via require_auth and passed in the payload
        required_fields = ['userId', 'travelCompanion', 'durationDays', 'budgetEur', 'attractionPreferences']

        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Verify that the token's user_id matches the payload's userId (extra security)
        if request.user_id != data['userId']:
            return jsonify({'error': 'Authorization mismatch'}), 403

        data['created'] = datetime.now().isoformat()
        
        # Stochează datele sondajului în Firebase
        survey_id = fb_service.create_preferences_survey(data) 

        return jsonify({
            'survey_id': survey_id, 
            'message': 'Preferences saved successfully'
        }), 201

    except Exception as e:
        print(f"Error submitting survey: {e}")
        return jsonify({'error': 'Could not save preferences'}), 500

# ============= HEALTH CHECK =============

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'Romania Tourism API'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
