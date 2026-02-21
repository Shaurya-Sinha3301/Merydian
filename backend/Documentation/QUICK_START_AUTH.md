# Quick Start Guide - Authentication System

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies (1 min)

```bash
# Backend
cd backend
pip install python-jose[cryptography] passlib[bcrypt]

# Frontend (if needed)
cd frontend
npm install
```

### Step 2: Initialize Database (1 min)

```bash
cd backend
python scripts/init_auth_db.py
```

When prompted, type `y` to create test users.

### Step 3: Start Services (1 min)

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Test Authentication (2 min)

1. Open browser: http://localhost:3000/login
2. Use test credentials:
   - **Email:** traveller@test.com
   - **Password:** testpass123
3. Click "Sign in as Customer"
4. You should be redirected to customer dashboard

### Step 5: Verify It's Working

Open browser DevTools (F12):
- **Application > Cookies:** You should see `refresh_token` (httpOnly)
- **Network > Any API call > Headers:** You should see `Authorization: Bearer ...`

## ✅ What You Get

- ✅ Real JWT authentication (no mocks)
- ✅ Secure token storage (httpOnly cookies + memory)
- ✅ Auto token refresh (every 25 minutes)
- ✅ Role-based access (traveller/agent)
- ✅ Protected routes
- ✅ Session management
- ✅ Logout functionality

## 🧪 Test Accounts

After running `init_auth_db.py`:

| Role      | Email                | Password     |
|-----------|---------------------|--------------|
| Traveller | traveller@test.com  | testpass123  |
| Agent     | agent@test.com      | testpass123  |

## 🔧 Troubleshooting

### "Module not found" errors
```bash
cd backend
pip install -r requirements.txt
```

### Database connection errors
Check `backend/.env` has correct `SQLALCHEMY_DATABASE_URI`

### CORS errors
Ensure `BACKEND_CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000`

### Token not working
1. Clear browser cookies
2. Restart backend server
3. Try logging in again

## 📖 Full Documentation

- **AUTH_SYSTEM_DOCUMENTATION.md** - Complete usage guide
- **AUTH_IMPLEMENTATION_SUMMARY.md** - What was implemented
- **AUTH_IMPLEMENTATION_PLAN.md** - Architecture details

## 🎯 Next Steps

1. Create your own user account via signup
2. Explore protected routes
3. Test logout functionality
4. Review the code to understand the flow

## 💡 Key Files to Understand

**Backend:**
- `backend/app/core/auth.py` - Token management
- `backend/app/api/auth.py` - Auth endpoints
- `backend/app/core/dependencies.py` - Route protection

**Frontend:**
- `frontend/contexts/AuthContext.tsx` - Auth state
- `frontend/components/ProtectedRoute.tsx` - Route protection
- `frontend/services/api.ts` - API calls

## 🔒 Security Notes

- Access tokens expire in 30 minutes
- Refresh tokens expire in 7 days
- Passwords are hashed with bcrypt
- Tokens are validated on every request
- Sessions can be revoked

## ✨ Features

- **Login:** Email + password authentication
- **Signup:** Create new accounts with validation
- **Auto-refresh:** Tokens refresh automatically
- **Logout:** Single or all-device logout
- **Protected Routes:** Automatic redirects
- **Role-based Access:** Traveller vs Agent permissions

---

**Ready to go!** 🎉

Your authentication system is now fully functional with production-grade security.
