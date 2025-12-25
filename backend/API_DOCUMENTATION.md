# Tasarini API Documentation - Travel Stories Module

## Overview

This document provides comprehensive documentation for the Travel Stories API endpoints. All endpoints are secured with authentication and rate limiting to prevent abuse.

## Base URL

```
http://localhost:8000/api/v1/
```

## Authentication

All protected endpoints require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

To obtain a token, authenticate via the `/api/v1/auth/login/` endpoint.

---

## Story Endpoints

### 1. List Stories

**Endpoint:** `GET /stories/`

**Authentication:** Optional (public stories visible to all, own private stories visible when authenticated)

**Description:** Retrieve a list of travel stories with filtering and sorting options.

**Query Parameters:**
- `search` (string): Search in title and content
- `location` (string): Filter by location name
- `date_from` (date): Filter stories after this date (YYYY-MM-DD)
- `date_to` (date): Filter stories before this date (YYYY-MM-DD)
- `tags` (string): Comma-separated list of tags (e.g., "paris,adventure")
- `story_type` (string): Filter by type (`user`, `ai_generated`, `partner_sponsored`)
- `linked_type` (string): Filter by linked entity type (`tourist_point`, `itinerary`, `activity`)
- `has_location` (boolean): Filter stories with location coordinates
- `mine` (boolean): Show only user's own stories
- `sort` (string): Sort order (`newest`, `popular`, `most_liked`, `most_commented`)
- `limit` (integer): Maximum number of results

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/stories/?location=Paris&sort=most_liked&limit=10"
```

**Example Response:**
```json
[
  {
    "id": 1,
    "author": 18,
    "author_name": "john.doe",
    "author_first_name": "John",
    "author_last_name": "Doe",
    "title": "Amazing trip to Paris",
    "content": "Paris was absolutely beautiful...",
    "tags": ["paris", "france", "adventure"],
    "media_images": ["https://example.com/image1.jpg"],
    "media_videos": [],
    "location_name": "Paris, France",
    "trip_date": "2025-11-15",
    "story_type": "user",
    "is_public": true,
    "is_featured": false,
    "likes_count": 42,
    "comments_count": 8,
    "views_count": 156,
    "created_at": "2025-12-01T10:00:00Z"
  }
]
```

---

### 2. Create Story

**Endpoint:** `POST /stories/`

**Authentication:** Required

**Rate Limit:** 5 requests per minute

**Description:** Create a new travel story.

**Request Body:**
```json
{
  "title": "My Amazing Trip",
  "content": "Story content here...",
  "tags": ["adventure", "beach"],
  "media_images": ["https://cloudinary.com/image.jpg"],
  "media_videos": [],
  "location_name": "Bali, Indonesia",
  "location_lat": -8.3405,
  "location_lon": 115.0920,
  "trip_date": "2025-11-20",
  "is_public": true
}
```

**Validation Rules:**
- `title`: Required, max 200 characters
- `content`: Required, max 50,000 characters
- `tags`: Optional, max 20 tags
- `media_images`: Optional, max 50 images, URLs must be from allowed domains
- `media_videos`: Optional, max 50 videos, URLs must be from allowed domains

**Allowed Media Domains:**
- cloudinary.com
- amazonaws.com / s3.amazonaws.com
- googleapis.com
- azure.com
- imgur.com
- youtube.com / youtu.be
- vimeo.com
- dailymotion.com

**Security:**
- Content is automatically sanitized to prevent XSS attacks
- Admin-only fields (`is_featured`, `is_verified`, `story_type`) are read-only for regular users
- Duplicate media URLs are automatically removed

**Example Response:**
```json
{
  "id": 123,
  "author": 18,
  "title": "My Amazing Trip",
  "content": "Story content here...",
  "created_at": "2025-12-11T11:30:00Z"
}
```

---

### 3. Retrieve Story

**Endpoint:** `GET /stories/{id}/`

**Authentication:** Optional (public stories only)

**Description:** Get details of a specific story.

---

### 4. Update Story

**Endpoint:** `PATCH /stories/{id}/`

**Authentication:** Required (owner or staff only)

**Description:** Update a story. Only the owner or staff members can update a story.

---

### 5. Delete Story

**Endpoint:** `DELETE /stories/{id}/`

**Authentication:** Required (owner or staff only)

**Description:** Delete a story. Only the owner or staff members can delete a story.

---

### 6. Get Trending Stories

**Endpoint:** `GET /stories/trending/`

**Authentication:** Optional

**Description:** Get trending stories based on engagement metrics.

**Query Parameters:**
- `days` (integer): Number of days to look back (default: 7)

**Engagement Score Formula:**
```
Likes × 3 + Comments × 5 + Views × 0.1
```

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/stories/trending/?days=30"
```

---

### 7. Get Personalized Recommendations

**Endpoint:** `GET /stories/recommendations/`

**Authentication:** Required

**Description:** Get personalized story recommendations based on user preferences.

**Algorithm:**
1. Analyzes user's liked stories to extract preferences (tags, locations)
2. Scores candidate stories based on:
   - Matching tags: +3 points per tag
   - Matching location: +5 points
   - Likes count: +0.1 per like
   - Comments count: +0.2 per comment
3. Returns top 10 scored stories

**Fallback:** If no liked stories, returns featured stories or most popular stories.

---

### 8. Get User Statistics

**Endpoint:** `GET /stories/stats/`

**Authentication:** Required

**Description:** Get the authenticated user's story statistics.

**Example Response:**
```json
{
  "stories_count": 15,
  "total_likes": 234,
  "countries_visited": 8,
  "followers_count": 0,
  "following_count": 0
}
```

---

### 9. Like Story

**Endpoint:**
- `GET /stories/{id}/like/` - Check like status
- `POST /stories/{id}/like/` - Toggle like

**Authentication:** Required

**Rate Limit:** 30 requests per minute

**Description:** Get or toggle like status for a story.

**POST Response:**
```json
{
  "liked": true,
  "likes_count": 43
}
```

---

### 10. Bookmark Story

**Endpoint:**
- `GET /stories/{id}/bookmark/` - Check bookmark status
- `POST /stories/{id}/bookmark/` - Toggle bookmark

**Authentication:** Required

**Rate Limit:** 30 requests per minute

**Description:** Get or toggle bookmark status for a story.

**POST Response:**
```json
{
  "bookmarked": true
}
```

---

## Comment Endpoints

### 1. List Comments

**Endpoint:** `GET /story-comments/`

**Authentication:** Optional

**Description:** List comments, filterable by story.

**Query Parameters:**
- `story` (integer): Filter by story ID

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/story-comments/?story=123"
```

---

### 2. Create Comment

**Endpoint:** `POST /story-comments/`

**Authentication:** Required

**Rate Limit:** 10 requests per minute

**Description:** Create a comment on a story.

**Request Body:**
```json
{
  "story": 123,
  "content": "Great story! Thanks for sharing."
}
```

**Example Response:**
```json
{
  "id": 456,
  "story": 123,
  "author": 18,
  "author_name": "John Doe",
  "content": "Great story! Thanks for sharing.",
  "sentiment": null,
  "created_at": "2025-12-11T11:45:00Z"
}
```

---

### 3. Delete Comment

**Endpoint:** `DELETE /story-comments/{id}/`

**Authentication:** Required (owner or staff only)

**Description:** Delete own comment.

---

## Rate Limiting

All rate limits are per authenticated user:

| Endpoint | Rate Limit |
|----------|------------|
| Story Creation | 5 requests/minute |
| Story Likes | 30 requests/minute |
| Story Bookmarks | 30 requests/minute |
| Comment Creation | 10 requests/minute |

**Rate Limit Response (429):**
```json
{
  "detail": "Request was throttled. Expected available in X seconds."
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "title": ["Le titre ne peut pas être vide"],
  "media_images": ["Le domaine de l'URL 'https://badsite.com/image.jpg' n'est pas autorisé"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 429 Too Many Requests
```json
{
  "detail": "Request was throttled. Expected available in 45 seconds."
}
```

---

## Security Features

### 1. Content Sanitization
All user-submitted content is sanitized to prevent XSS attacks. Only safe HTML tags are allowed:
- Allowed tags: `p`, `br`, `strong`, `em`, `u`, `a`, `ul`, `ol`, `li`, `blockquote`
- Allowed attributes: `href` and `title` for `<a>` tags only

### 2. URL Validation
Media URLs (images and videos) are validated against a whitelist of allowed domains to prevent malicious content.

### 3. Permission Separation
- Regular users: Can only modify `title`, `content`, `tags`, `media_images`, `media_videos`, `location_*`, `trip_date`, `is_public`
- Admin users: Can modify all fields including `is_featured`, `is_verified`, `story_type`

### 4. Rate Limiting
All write operations are rate-limited to prevent spam and abuse.

### 5. Database Indexes
Optimized queries with indexes on:
- `(story_type, is_public, created_at)` - Story listing
- `location_name` - Location searches
- `trip_date` - Date filtering
- `(is_featured, likes_count)` - Featured stories
- `(author, created_at)` - Author's stories
- `(is_public, likes_count, created_at)` - Popular stories

---

## OpenAPI Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/api/schema/swagger-ui/`
- ReDoc: `http://localhost:8000/api/schema/redoc/`

---

## Version Information

- API Version: 0.1.0
- Django Version: 5.1.15
- Django REST Framework: 3.16.1
- Last Updated: December 11, 2025
