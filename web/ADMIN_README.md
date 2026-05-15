# Admin Dashboard And Flask Admin API

This document explains how the web admin dashboard is wired to Flask, what the admin routes do, and how to test them in Postman.

## Scope

The admin side is handled fully through the Flask API. Spring Boot remains responsible for scanning, scan history, mailbox, and attachment analysis.

The web admin dashboard uses Flask for:

- Admin login/session validation
- Dashboard summary metrics
- User listing
- User role/status updates
- Soft-removing users

## Runtime URLs

| Service | Default URL |
| --- | --- |
| Web dashboard | `http://localhost:5173` |
| Flask API | `http://127.0.0.1:5001` |

## Auth Model

Flask issues two tokens after login:

| Token | Lifetime | Purpose |
| --- | --- | --- |
| Access token | 15 minutes | Used in `Authorization: Bearer <token>` for protected routes |
| Refresh token | 7 days | Used by `/api/auth/refresh` to silently issue a new access token |

The web app now refreshes access tokens automatically before protected admin API calls. Users should not need to log in again every 15 minutes while the refresh token remains valid.

Admin routes require a Flask JWT payload with:

```json
{
  "role": "admin"
}
```

If the user role is not `admin`, Flask returns `403 Unauthorized`.

## Admin API Routes

All admin routes use this header:

```http
Authorization: Bearer ACCESS_TOKEN
```

### Get Dashboard Summary

```http
GET /api/admin/dashboard/summary
```

Returns live dashboard data computed from Firestore scan history.

Example response:

```json
{
  "kpis": [
    { "label": "Total Scans", "value": "12", "delta": "Live", "icon": "Radar" },
    { "label": "Blocked Threats", "value": "4", "delta": "Risk >= low", "icon": "ShieldCheck" }
  ],
  "chartData": [
    { "date": "2026-05-15", "scans": 3 }
  ],
  "threatDistribution": [
    { "label": "Safe", "value": 58, "variant": "safe" }
  ]
}
```

### List Users

```http
GET /api/admin/users
```

Returns users from the Firestore `users` collection, excluding soft-deleted users.

Example response:

```json
{
  "users": [
    {
      "id": "firebase-uid",
      "uid": "firebase-uid",
      "name": "Shubham Pathak",
      "email": "shubh@example.com",
      "role": "Admin",
      "status": "Active",
      "provider": "google",
      "photoURL": "https://...",
      "createdAt": "2026-05-15T12:00:00+00:00",
      "updatedAt": null
    }
  ]
}
```

### Update User

```http
PATCH /api/admin/users/:userId
```

Supported fields:

```json
{
  "role": "Admin",
  "status": "Active"
}
```

Valid roles:

- `Viewer`
- `Analyst`
- `Admin`

Valid statuses:

- `Active`
- `Suspended`

The frontend shows role/status as plain text by default. Clicking `Edit` opens dropdowns; changes are persisted only after `Save`.

### Remove User

```http
DELETE /api/admin/users/:userId
```

This is a soft delete. It sets:

```json
{
  "deleted_at": "timestamp",
  "status": "Suspended",
  "suspended": true,
  "disabled": true
}
```

The document is not physically removed from Firestore.

## Postman Testing Flow

### 1. Start Flask

From `Flask-Api`:

```powershell
python run.py
```

### 2. Login And Get Tokens

Use the web app login for normal testing, or call Flask directly if you already have a Firebase ID token.

Firebase login route:

```http
POST http://127.0.0.1:5001/api/auth/firebase-login
Authorization: Bearer FIREBASE_ID_TOKEN
```

Response:

```json
{
  "access": "ACCESS_TOKEN",
  "refresh": "REFRESH_TOKEN"
}
```

### 3. Confirm Profile

```http
GET http://127.0.0.1:5001/api/user/profile
Authorization: Bearer ACCESS_TOKEN
```

Check that the response includes:

```json
{
  "user": {
    "role": "admin"
  }
}
```

If role is not `admin`, admin routes will return `403`.

### 4. Test Admin Summary

```http
GET http://127.0.0.1:5001/api/admin/dashboard/summary
Authorization: Bearer ACCESS_TOKEN
```

Expected status:

```text
200 OK
```

### 5. Test User Listing

```http
GET http://127.0.0.1:5001/api/admin/users
Authorization: Bearer ACCESS_TOKEN
```

Expected status:

```text
200 OK
```

### 6. Test Token Refresh

```http
POST http://127.0.0.1:5001/api/auth/refresh
Content-Type: application/json
```

Body:

```json
{
  "refresh": "REFRESH_TOKEN"
}
```

Expected response:

```json
{
  "access": "NEW_ACCESS_TOKEN"
}
```

The refreshed access token preserves the latest role from Firestore.

## Common Status Codes

| Status | Meaning | Fix |
| --- | --- | --- |
| `200` | Request succeeded | No action needed |
| `401` | Missing/invalid/expired access token | Refresh or log in again |
| `403` | Token is valid but user is not admin | Set the Firestore user role to `admin` |
| `404` | User document not found | Check the `userId` path parameter |

## Notes

- `OPTIONS ... 200` in Flask logs is normal browser CORS preflight.
- Duplicate `GET ... 200` calls in development can happen because React dev mode/StrictMode may invoke effects twice.
- The local warning about Flask-Limiter in-memory storage is safe for development but should be replaced with Redis or another shared store in production.
- The local JWT warning about short `JWT_SECRET` can be fixed by setting a longer secret in the environment.
