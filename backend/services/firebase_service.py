# backend/services/firebase_service.py
import firebase_admin
from firebase_admin import credentials, db
import os
import json

class FirebaseService:
    def __init__(self):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            # Load credentials from JSON file
            credentials_path = os.path.join(os.path.dirname(__file__), '..', 'firebase-credentials.json')

            if not os.path.exists(credentials_path):
                raise FileNotFoundError(
                    f"Firebase credentials file not found at {credentials_path}. "
                    "Please download your service account key from Firebase Console and save it as "
                    "'backend/firebase-credentials.json'"
                )

            cred = credentials.Certificate(credentials_path)

            # Use Europe region database URL
            database_url = 'https://isi-tema-d98b9-default-rtdb.europe-west1.firebasedatabase.app/'

            firebase_admin.initialize_app(cred, {
                'databaseURL': database_url
            })

        self.db = db.reference()
    
    # ============= USERS =============

    def get_user(self, user_id):
        """Get single user by ID"""
        ref = self.db.child('users').child(user_id)
        return ref.get()

    def get_user_by_email(self, email):
        """Get user by email"""
        ref = self.db.child('users')
        users = ref.order_by_child('email').equal_to(email).get()
        if users:
            for key, value in users.items():
                value['user_id'] = key
                return value
        return None

    def create_user(self, data):
        """Create new user"""
        ref = self.db.child('users')
        new_ref = ref.push(data)
        return new_ref.key

    def update_user(self, user_id, data):
        """Update existing user"""
        ref = self.db.child('users').child(user_id)
        ref.update(data)
        return True

    def delete_user(self, user_id):
        """Delete user"""
        ref = self.db.child('users').child(user_id)
        ref.delete()
        return True

    # ============= CITIES =============

    def get_cities(self):
        """Get all cities"""
        ref = self.db.child('cities')
        cities = ref.get()

        if not cities:
            return []

        result = []
        for key, value in cities.items():
            value['city_id'] = key
            result.append(value)

        return result

    def get_city(self, city_id):
        """Get single city by ID"""
        ref = self.db.child('cities').child(city_id)
        city = ref.get()

        if city:
            city['city_id'] = city_id

        return city

    def create_city(self, data):
        """Create new city"""
        ref = self.db.child('cities')
        new_ref = ref.push(data)
        return new_ref.key

    def update_city(self, city_id, data):
        """Update existing city"""
        ref = self.db.child('cities').child(city_id)
        ref.update(data)
        return True

    def delete_city(self, city_id):
        """Delete city"""
        ref = self.db.child('cities').child(city_id)
        ref.delete()
        return True

    # ============= ATTRACTIONS =============

    def get_attractions(self, city_id=None, attraction_type=None):
        """Get all attractions with optional filters"""
        ref = self.db.child('attractions')

        if city_id:
            attractions = ref.order_by_child('city_id').equal_to(city_id).get()
        else:
            attractions = ref.get()

        if not attractions:
            return []

        # Convert to list with IDs
        result = []
        for key, value in attractions.items():
            value['attraction_id'] = key
            result.append(value)

        # Apply type filter
        if attraction_type:
            result = [a for a in result if a.get('type') == attraction_type]

        return result

    def get_attraction(self, attraction_id):
        """Get single attraction by ID"""
        ref = self.db.child('attractions').child(attraction_id)
        attraction = ref.get()

        if attraction:
            attraction['attraction_id'] = attraction_id

        return attraction

    def create_attraction(self, data):
        """Create new attraction"""
        ref = self.db.child('attractions')
        new_ref = ref.push(data)
        return new_ref.key

    def update_attraction(self, attraction_id, data):
        """Update existing attraction"""
        ref = self.db.child('attractions').child(attraction_id)
        ref.update(data)
        return True

    def delete_attraction(self, attraction_id):
        """Delete attraction"""
        ref = self.db.child('attractions').child(attraction_id)
        ref.delete()
        return True

    # ============= REVIEWS =============

    def create_review(self, data):
        ref = self.db.child('reviews').push(data)
        return ref['name']

    def get_reviews(self, attraction_id=None, itinerary_id=None, user_id=None):
        """Gets reviews with optional filters."""
        ref = self.db.child('reviews')
        
        query = ref.get()
        if not query:
            return []
        reviews = []
        
        for key, value in query.items():
            value['id'] = key
            if attraction_id and value.get('attraction_id') == attraction_id:
                reviews.append(value)
            elif itinerary_id and value.get('itinerary_id') == itinerary_id:
                reviews.append(value)
            elif user_id and value.get('user_id') == user_id:
                reviews.append(value)
            elif not attraction_id and not itinerary_id and not user_id:
                reviews.append(value)
                
        return reviews
    
    def calculate_average_rating(self, attraction_id=None, itinerary_id=None):
        """Calculates the average rating and count for a specific attraction or itinerary."""
        reviews = self.get_reviews(attraction_id=attraction_id, itinerary_id=itinerary_id)
        count = len(reviews)
        
        if count == 0:
            return {'average': 0, 'count': 0}
            
        total_rating = sum(r.get('rating', 0) for r in reviews)
        
        # Asigură-te că ratingul mediu este rotunjit la 1 zecimală
        average_rating = round(total_rating / count, 1)
        
        return {'average': average_rating, 'count': count}

    def update_itinerary_rating(self, itinerary_id):
        """Updates rating summary on itinerary."""
        rating = self.calculate_average_rating(itinerary_id=itinerary_id)
        ref = self.db.child('itineraries').child(itinerary_id)
        ref.update({
            'ratingAverage': rating.get('average', 0),
            'ratingCount': rating.get('count', 0)
        })

    def get_review(self, review_id):
        """Get single review by ID"""
        ref = self.db.child('reviews').child(review_id)
        review = ref.get()

        if review:
            review['review_id'] = review_id

        return review

    def create_review(self, data):
        """Create new review"""
        ref = self.db.child('reviews')
        new_ref = ref.push(data)
        return new_ref.key

    def update_review(self, review_id, data):
        """Update existing review"""
        ref = self.db.child('reviews').child(review_id)
        ref.update(data)
        return True

    def delete_review(self, review_id):
        """Delete review"""
        ref = self.db.child('reviews').child(review_id)
        ref.delete()
        return True
    
    # ============= PREFERENCES / SURVEY =============

    def create_preferences_survey(self, data):
        """Stores a new user preference survey document in the 'user_preferences' collection, using userId as key."""
        user_id = data.get('userId')
        if not user_id:
            raise ValueError("userId is required for saving preferences.")
        
        # Vom folosi ID-ul utilizatorului ca cheie a documentului.
        # Asta asigură că un utilizator are un singur set de preferințe care este actualizat (overwrite) la fiecare trimitere.
        ref = self.db.child('user_preferences').child(user_id)
        ref.set(data)
        
        return user_id
    
    # ============= ITINERARIES =============
    
    def get_itineraries(self, limit=20, user_id=None, posted=None):
        """Get itineraries for feed"""
        ref = self.db.child('itineraries')
        
        if user_id:
            # Get user's itineraries
            itineraries = ref.order_by_child('userId').equal_to(user_id).get()
        else:
            if posted is True:
                itineraries = ref.order_by_child('posted').equal_to(True).get()
            else:
                # Get all itineraries (for feed)
                itineraries = ref.order_by_child('created').limit_to_last(limit).get()
        
        if not itineraries:
            return []
        
        # Convert to list with IDs
        result = []
        for key, value in itineraries.items():
            value['id'] = key
            if posted is None or value.get('posted') == posted:
                result.append(value)
        
        # Sort by created date (newest first)
        result.sort(key=lambda x: x.get('created', ''), reverse=True)
        if limit and len(result) > limit:
            result = result[:limit]
        
        return result
    
    def get_itinerary(self, itinerary_id):
        """Get single itinerary by ID"""
        ref = self.db.child('itineraries').child(itinerary_id)
        itinerary = ref.get()
        
        if itinerary:
            itinerary['id'] = itinerary_id
        
        return itinerary
    
    def create_itinerary(self, data):
        """Create new itinerary"""
        ref = self.db.child('itineraries')
        new_ref = ref.push(data)
        return new_ref.key
    
    def update_itinerary(self, itinerary_id, data):
        """Update existing itinerary"""
        ref = self.db.child('itineraries').child(itinerary_id)
        ref.update(data)
        return True
    
    def delete_itinerary(self, itinerary_id):
        """Delete itinerary"""
        ref = self.db.child('itineraries').child(itinerary_id)
        ref.delete()
        return True
    
    def increment_likes(self, itinerary_id):
        """Increment likes count"""
        ref = self.db.child('itineraries').child(itinerary_id)
        itinerary = ref.get()
        
        if itinerary:
            current_likes = itinerary.get('likes', 0)
            ref.update({'likes': current_likes + 1})
            return True
        
        return False
    
    def increment_views(self, itinerary_id):
        """Increment views count"""
        ref = self.db.child('itineraries').child(itinerary_id)
        itinerary = ref.get()
        
        if itinerary:
            current_views = itinerary.get('views', 0)
            ref.update({'views': current_views + 1})
            return True
        
        return False
