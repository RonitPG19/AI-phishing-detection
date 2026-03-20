# 🚀 Flask Firebase Auth API

A production-ready Flask backend with:

- 🔐 Google Sign-In (via Firebase Authentication)
- 📧 Email/Password Authentication
- 🔑 JWT Authentication (Access + Refresh Tokens)
- 🔄 Token Refresh System
- 🚪 Logout with token blacklisting (in-memory)
- 🗄 Firestore database integration
- 🚦 Rate limiting
- 🪵 Logging

---

# 📁 Project Structure

```
flask_app/
│
├── app/
│   ├── __init__.py
│   ├── config.py
│
│   ├── extensions/
│   │   ├── firebase.py
│   │   ├── jwt.py
│   │   └── limiter.py
│
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   ├── services.py
│   │   │   └── utils.py
│   │   │
│   │   ├── user/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── services.py
│   │   │   └── routes.py
│
│   ├── middleware/
│   │   └── auth_middleware.py
│
│   ├── utils/
│   │   ├── decorators.py
│   │   ├── hashing.py
│   │   ├── helper.py
│   │   ├── response.py
│   │   └── logger.py
│
├── migrations/
|
├── tests/
|   ├── test_auth.py
│   └── test_user.py
│
├── run.py
├── wsgi.py
├── requirements.txt
├── .env
└── serviceAccountKey.json
```

---

# ⚙️ Setup Instructions

## 1. Clone Project

```
git clone <your-repo-url>
cd flask_app
```

---

## 2. Create Virtual Environment

```
python -m venv venv
```

### Activate:

**Windows**

```
venv\Scripts\activate
```

**Mac/Linux**

```
source venv/bin/activate
```

---

## 3. Install Dependencies

```
pip install -r requirements.txt
```

---

## 4. Firebase Setup

1. Go to Firebase Console
2. Enable **Google Authentication**
3. Create **Firestore Database**
4. Download **serviceAccountKey.json**
5. Place it in project root:

```
flask_app/serviceAccountKey.json
```

---

## 5. Environment Variables

Create `.env` file:

```
SECRET_KEY=key1
JWT_SECRET=key2
```

---

## 6. Run Application

```
python run.py
```

App will run on:

```
http://localhost:5001
```

---

# 🔐 API Endpoints

## Auth Routes

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| POST   | /api/auth/register | Register user        |
| POST   | /api/auth/login    | Login user           |
| POST   | /api/auth/google   | Google login         |
| POST   | /api/auth/refresh  | Refresh access token |
| POST   | /api/auth/logout   | Logout               |

---

## User Routes

| Method | Endpoint          | Description     |
| ------ | ----------------- | --------------- |
| GET    | /api/user/profile | Protected route |

---

# 🧪 Postman Testing Guide

---

## 🔹 1. Register User

**POST**

```
http://localhost:5001/api/auth/register
```

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "email": "test@test.com",
  "password": "123456"
}
```

---

## 🔹 2. Login User

**POST**

```
http://localhost:5001/api/auth/login
```

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "email": "test@test.com",
  "password": "123456"
}
```

**Response**

```json
{
  "access": "ACCESS_TOKEN",
  "refresh": "REFRESH_TOKEN"
}
```

👉 Save both tokens

---

## 🔹 3. Access Protected Route

**GET**

```
http://localhost:5001/api/user/profile
```

**Headers**

```
Authorization: Bearer ACCESS_TOKEN
```

---

## 🔹 4. Refresh Token

**POST**

```
http://localhost:5001/api/auth/refresh
```

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "refresh": "REFRESH_TOKEN"
}
```

---

## 🔹 5. Logout

**POST**

```
http://localhost:5001/api/auth/logout
```

**Headers**

```
Authorization: Bearer ACCESS_TOKEN
```

---

## 🔹 6. Google Login

### Step 1: Get Firebase Token (Frontend)

```javascript
const token = await user.getIdToken();
```

---

### Step 2: Call API

**POST**

```
http://localhost:5001/api/auth/google
```

**Headers**

```
Authorization: Bearer FIREBASE_TOKEN
```

---

# ⚠️ Common Issues

- ❌ Missing Bearer in Authorization header
- ❌ Invalid or expired token
- ❌ Firebase credentials not placed correctly
- ❌ Wrong request body format

---

# 🔐 Security Notes

- Do NOT commit `serviceAccountKey.json`
- Use environment variables for secrets
- Use HTTPS in production
- Replace in-memory blacklist with Redis for scaling

---

# 🚀 Future Improvements

- Email verification
- Password reset
- Role-based access control (RBAC)
- Docker deployment
- CI/CD integration

---

# 👨‍💻 Author

Kenil Patel 🚀
