# Romania Tourism Backend API

Flask backend for the Romania Tourism Itinerary application.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r ../requirements.txt
```

### 2. Configure Firebase

Create a `.env` file based on `.env.example` or download the Firebase service account JSON:

```bash
# Download from Firebase Console:
# Project Settings > Service Accounts > Generate New Private Key
# Save as: backend/firebase-credentials.json
```

### 3. Seed Sample Data

```bash
python seed_data.py
```

Other seeding options:
```bash
# Seed only sample itineraries
python seed_data.py --itineraries-only

# Clear all data
python seed_data.py --clear
```

### 4. Run the Server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Attractions

- `GET /api/attractions` - Get all attractions (supports filters: category, region, city)
- `GET /api/attractions/:id` - Get single attraction
- `POST /api/attractions` - Create new attraction
- `PUT /api/attractions/:id` - Update attraction
- `DELETE /api/attractions/:id` - Delete attraction

### Itineraries

- `GET /api/itineraries` - Get itineraries feed (supports filters: userId, limit)
- `GET /api/itineraries/:id` - Get single itinerary (increments view count)
- `POST /api/itineraries` - Create new itinerary
- `PUT /api/itineraries/:id` - Update itinerary
- `DELETE /api/itineraries/:id` - Delete itinerary
- `POST /api/itineraries/:id/like` - Like an itinerary

### Health Check

- `GET /api/health` - Health check endpoint

## Example Requests

### Get all attractions in Transylvania
```bash
curl http://localhost:5000/api/attractions?region=Transylvania
```

### Create a new itinerary
```bash
curl -X POST http://localhost:5000/api/itineraries \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Romania Trip",
    "description": "A wonderful journey through Romania",
    "attractions": [...],
    "userId": "user123",
    "userName": "John Doe"
  }'
```

### Like an itinerary
```bash
curl -X POST http://localhost:5000/api/itineraries/abc123/like
```

## Data Structure

### Attraction
```json
{
  "name": "Bran Castle",
  "description": "Famous medieval castle...",
  "latitude": 45.5150,
  "longitude": 25.3673,
  "category": "Historical Monument",
  "city": "Bran",
  "region": "Transylvania",
  "address": "Strada General Traian Moșoiu 24",
  "imageUrl": "https://..."
}
```

### Itinerary
```json
{
  "title": "Transylvania Castles Adventure",
  "description": "Explore the most famous castles...",
  "attractions": [...],
  "userId": "user123",
  "userName": "Maria Popescu",
  "duration": "3 days",
  "totalDistance": 245.5,
  "likes": 42,
  "views": 156,
  "routeGeometry": {...}
}
```