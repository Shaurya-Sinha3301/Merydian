# Authentication System Documentation

## Overview

This project now implements a **production-grade authentication system** with the following features:

### Security Features
- ✅ JWT-based authentication with access and refresh tokens
- ✅ Refresh tokens stored in httpOnly cookies (XSS protection)
- ✅ Access tokens stored in memory only (not localStorage for security)
- ✅ Token blacklist for revoked tokens
- ✅ Session management with device tracking
- ✅ Bcrypt password hashing (industry standard)
- ✅ Automatic token refresh before expiration
- ✅ Comprehensive audit logging
- ✅ Role-based access control (RBAC)
- ✅ Protected routes on frontend
- ✅ Secure password requirements (min 8 characters)

## Architecture

### Backend Components

#### 1. Token Management (`backend/app/core/auth.py`)
- `TokenManager` class handles all token operations
- Creates access tokens (30 min expiry) and refresh tokens (7 day expiry)
- Validates tokens and checks blacklist
- Manages user sessions

#### 2. Database Models
- `User` (`backend/app/models/user.py`) - User accounts
- `TokenBlacklist` (`backend/app/models/token_blacklist.py`) - Revoked tokens
- `UserSession` (`backend/app/models/user_session.py`) - Active sessions

#### 3. API Endpoints (`backend/app/api/auth.py`)
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/signup` - Create new account
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout current session
- `POST /api/v1/auth/logout-all` - Logout all sessions

#### 4. Dependencies (`backend/app/core/dependencies.py`)
- `get_current_user()` - Validates access token, returns user payload
- `get_current_traveller()` - Ensures user is a traveller
- `get_current_agent()` - Ensures user is an agent
- `get_optional_user()` - Optional authentication (doesn't raise 401)

### Frontend Components

#### 1. Auth Context (`frontend/contexts/AuthContext.tsx`)
- Manages authentication state globally
- Provides login, signup, logout functions
- Handles automatic token refresh
- Decodes JWT to extract user info

#### 2. Protected Routes (`frontend/components/ProtectedRoute.tsx`)
- Wraps pages that require authentication
- Redirects unauthenticated users to login
- Enforces role-based access

#### 3. API Client (`frontend/services/api.ts`)
- Handles all HTTP requests with authentication
- Automatically includes access token in headers
- Sends cookies for refresh token
- Implements login, signup, refresh, logout methods

## Setup Instructions

### 1. Database Migration

Run the migration to create authentication tables:

```bash
cd backend
psql $SQLALCHEMY_DATABASE_URI < migrations/add_auth_tables.sql
```

Or using Python:

```python
from sqlmodel import SQLModel
from app.core.db import engine
from app.models.user import User
from app.models.token_blacklist import TokenBlacklist
from app.models.user_session import UserSession

SQLModel.metadata.create_all(engine)
```

### 2. Environment Variables

Ensure these are set in `backend/.env`:

```env
SECRET_KEY="your-secret-key-here"  # Generate with: openssl rand -hex 32
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 3. Install Dependencies

Backend:
```bash
cd backend
pip install python-jose[cryptography] passlib[bcrypt]
```

Frontend:
```bash
cd frontend
npm install
# No additional packages needed
```

### 4. Start Services

Backend:
```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm run dev
```

## Usage Examples

### Frontend - Login

```typescript
import { useAuth } from '../contexts/AuthContext';

function LoginComponent() {
  const { login, isLoading } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      // Redirect handled automatically by AuthContext
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

### Frontend - Protected Route

```typescript
import ProtectedRoute from '../components/ProtectedRoute';

export default function CustomerDashboard() {
  return (
    <ProtectedRoute requiredRole="traveller">
      <div>Customer Dashboard Content</div>
    </ProtectedRoute>
  );
}
```

### Backend - Protected Endpoint

```python
from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user, get_current_agent
from app.schemas.auth import TokenPayload

router = APIRouter()

@router.get("/protected")
async def protected_route(
    current_user: TokenPayload = Depends(get_current_user)
):
    return {"user_id": current_user.sub, "role": current_user.role}

@router.get("/agent-only")
async def agent_only_route(
    current_agent: TokenPayload = Depends(get_current_agent)
):
    return {"message": "Agent access granted"}
```

## Token Flow

### Login Flow
1. User submits email/password
2. Backend validates credentials
3. Backend creates access token (30 min) and refresh token (7 days)
4. Refresh token sent in httpOnly cookie
5. Access token returned in response body
6. Frontend stores access token in memory
7. Frontend includes access token in Authorization header

### Token Refresh Flow
1. Frontend detects token expiring soon (auto-refresh every 25 min)
2. Frontend sends refresh request with cookie
3. Backend validates refresh token from cookie
4. Backend generates new access token
5. Frontend updates access token in memory

### Logout Flow
1. User clicks logout
2. Frontend calls logout endpoint with access token
3. Backend blacklists both access and refresh tokens
4. Backend revokes user session
5. Backend clears refresh token cookie
6. Frontend clears access token from memory
7. Frontend redirects to login

## Security Best Practices

### Implemented
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ Refresh tokens in httpOnly cookies (XSS protection)
- ✅ Access tokens short-lived (30 minutes)
- ✅ Token blacklist prevents reuse after logout
- ✅ Session tracking with device info
- ✅ CORS properly configured
- ✅ Credentials included in requests
- ✅ Role-based access control

### Recommended Additions
- [ ] Rate limiting on auth endpoints (implement with Redis)
- [ ] Account lockout after failed attempts
- [ ] Email verification for new accounts
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)
- [ ] HTTPS enforcement in production
- [ ] CSRF protection for state-changing operations
- [ ] Security headers (Helmet.js)

## Testing

### Test User Creation

```python
from app.services.user_service import UserService

# Create test traveller
user = UserService.create_user(
    email="traveller@test.com",
    password="testpass123",
    role="traveller",
    full_name="Test Traveller"
)

# Create test agent
agent = UserService.create_user(
    email="agent@test.com",
    password="testpass123",
    role="agent",
    full_name="Test Agent"
)
```

### Test Login

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=traveller@test.com&password=testpass123"

# Use returned access_token in subsequent requests
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>"
```

## Troubleshooting

### Issue: "Could not validate credentials"
- Check if token is expired
- Verify SECRET_KEY matches between token creation and validation
- Check if token is blacklisted

### Issue: "Refresh token not found"
- Ensure cookies are enabled
- Check CORS configuration allows credentials
- Verify `credentials: 'include'` in fetch requests

### Issue: "User account is inactive"
- Check `is_active` field in users table
- Reactivate user: `UPDATE users SET is_active = true WHERE email = 'user@example.com'`

## Maintenance

### Cleanup Expired Tokens

Run periodically (e.g., daily cron job):

```python
from app.core.auth import TokenManager

# Remove expired tokens from blacklist
count = TokenManager.cleanup_expired_tokens()
print(f"Cleaned up {count} expired tokens")
```

### Revoke All User Sessions

```python
from app.core.auth import TokenManager

# Force logout user from all devices
TokenManager.revoke_all_user_sessions(
    user_id="user-uuid-here",
    reason="security_breach"
)
```

## Migration from Old System

If you have existing users with old password hashes:

1. Old passwords will still work (passlib handles migration)
2. On next login, password will be re-hashed with bcrypt
3. No user action required

## Production Checklist

Before deploying to production:

- [ ] Generate strong SECRET_KEY (32+ bytes)
- [ ] Enable HTTPS only
- [ ] Set secure=True for cookies
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Set up token cleanup cron job
- [ ] Configure session timeout
- [ ] Add monitoring for failed login attempts
- [ ] Set up alerts for suspicious activity

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in auth modules
3. Check application logs
4. Consult AUTH_IMPLEMENTATION_PLAN.md for architecture details
