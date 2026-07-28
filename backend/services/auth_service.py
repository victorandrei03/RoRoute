import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import os

class AuthService:
    def __init__(self, secret_key=None):
        self.secret_key = secret_key or os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
        self.algorithm = 'HS256'
        self.token_expiration_hours = 24

    def hash_password(self, password):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def verify_password(self, password, hashed_password):
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            print(f"Password verification error: {e}")
            return False

    def generate_token(self, user_id, email):
        payload = {
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=self.token_expiration_hours),
            'iat': datetime.utcnow()
        }
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token

    def verify_token(self, token):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def get_token_from_header(self):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        try:
            # Expected format: "Bearer <token>"
            parts = auth_header.split()
            if parts[0].lower() != 'bearer' or len(parts) != 2:
                return None
            return parts[1]
        except:
            return None

    def require_auth(self, f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = self.get_token_from_header()

            if not token:
                return jsonify({'error': 'No token provided'}), 401

            payload = self.verify_token(token)
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401

            # Add user info to request context
            request.user_id = payload['user_id']
            request.user_email = payload['email']

            return f(*args, **kwargs)

        return decorated_function

    def optional_auth(self, f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = self.get_token_from_header()

            if token:
                payload = self.verify_token(token)
                if payload:
                    request.user_id = payload['user_id']
                    request.user_email = payload['email']
                else:
                    request.user_id = None
                    request.user_email = None
            else:
                request.user_id = None
                request.user_email = None

            return f(*args, **kwargs)

        return decorated_function
