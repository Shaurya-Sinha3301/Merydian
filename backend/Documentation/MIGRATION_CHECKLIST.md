# Migration Checklist - Upgrading to New Auth System

## 📋 Pre-Migration Checklist

- [ ] Backup database
- [ ] Review current user accounts
- [ ] Note any custom authentication logic
- [ ] Check for hardcoded tokens in code
- [ ] Identify all protected endpoints
- [ ] Document current user flow

## 🔄 Migration Steps

### 1. Database Migration

#### Option A: Using SQL Script (Recommended)
```bash
cd backend
psql $SQLALCHEMY_DATABASE_URI < migrations/add_auth_tables.sql
```

#### Option B: Using Python Script
```bash
cd backend
python scripts/init_auth_db.py
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('token_blacklist', 'user_sessions');
```

### 2. Update Environment Variables

Add to `backend/.env`:
```env
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Verify existing:
```env
SECRET_KEY="your-secret-key"  # Must be set
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Update Dependencies

```bash
cd backend
pip install python-jose[cryptography] passlib[bcrypt]
```

### 4. Restart Backend

```bash
cd backend
# Stop current server (Ctrl+C)
uvicorn app.main:app --reload
```

### 5. Update Frontend

```bash
cd frontend
npm install  # Ensure all deps are installed
npm run dev
```

### 6. Test Authentication Flow

- [ ] Login with existing user
- [ ] Create new user via signup
- [ ] Verify token in cookies (DevTools)
- [ ] Test protected routes
- [ ] Test logout
- [ ] Test token refresh

## 🔍 Verification Steps

### Backend Verification

1. **Check tables exist:**
```bash
psql $SQLALCHEMY_DATABASE_URI -c "\dt"
```

Should show:
- users
- families
- token_blacklist
- user_sessions

2. **Test login endpoint:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=yourpassword"
```

Should return:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

3. **Test protected endpoint:**
```bash
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>"
```

### Frontend Verification

1. **Open browser DevTools (F12)**
2. **Go to Application > Cookies**
3. **Login and verify:**
   - `refresh_token` cookie exists
   - Cookie is httpOnly
   - Cookie has expiration date

4. **Go to Network tab**
5. **Make any API call and verify:**
   - Request has `Authorization: Bearer ...` header
   - Request includes cookies

## 🚨 Common Issues & Solutions

### Issue: "Could not validate credentials"

**Cause:** Token validation failing

**Solution:**
1. Check SECRET_KEY is same in .env
2. Verify token not expired
3. Check token_blacklist table for revoked tokens

### Issue: "Refresh token not found"

**Cause:** Cookie not being sent

**Solution:**
1. Check CORS settings allow credentials
2. Verify `credentials: 'include'` in fetch calls
3. Check cookie domain matches

### Issue: Existing users can't login

**Cause:** Password hash mismatch

**Solution:**
Passwords hashed with old method will still work. On next login, they'll be re-hashed with bcrypt automatically.

### Issue: Database migration fails

**Cause:** Tables already exist or permissions issue

**Solution:**
```sql
-- Check if tables exist
SELECT * FROM token_blacklist LIMIT 1;
SELECT * FROM user_sessions LIMIT 1;

-- If they exist, migration already done
-- If permission error, check database user permissions
```

## 📊 Data Migration (If Needed)

### Migrate Existing Sessions

If you have existing session data:

```python
from app.core.auth import TokenManager
from app.services.user_service import UserService

# For each active user, create a new session
users = UserService.get_all_active_users()
for user in users:
    # Force re-login by invalidating old tokens
    # Users will need to login again
    pass
```

### Clean Up Old Auth Data

```sql
-- Remove old session tables if they exist
DROP TABLE IF EXISTS old_sessions;

-- Remove old token tables if they exist
DROP TABLE IF EXISTS old_tokens;
```

## 🔐 Security Considerations

### Before Going Live

- [ ] Generate new SECRET_KEY for production
- [ ] Enable HTTPS only
- [ ] Set secure=True for cookies in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Set up monitoring

### Generate New SECRET_KEY

```bash
# Generate secure secret key
openssl rand -hex 32
```

Update in `backend/.env`:
```env
SECRET_KEY="<new-generated-key>"
```

## 📝 Post-Migration Tasks

- [ ] Monitor error logs for auth issues
- [ ] Check user login success rate
- [ ] Verify token refresh working
- [ ] Test logout from multiple devices
- [ ] Verify session cleanup
- [ ] Update API documentation
- [ ] Notify users of any changes

## 🔄 Rollback Plan

If issues occur:

1. **Stop services**
```bash
# Stop backend and frontend
```

2. **Restore database backup**
```bash
psql $SQLALCHEMY_DATABASE_URI < backup.sql
```

3. **Revert code changes**
```bash
git revert <commit-hash>
```

4. **Restart services**

## ✅ Success Criteria

Migration is successful when:

- [ ] All users can login
- [ ] New users can signup
- [ ] Tokens are properly validated
- [ ] Protected routes work
- [ ] Logout works
- [ ] Token refresh works
- [ ] No authentication errors in logs
- [ ] Session tracking working
- [ ] Role-based access working

## 📞 Support

If you encounter issues:

1. Check logs: `backend/logs/` or console output
2. Review documentation: `AUTH_SYSTEM_DOCUMENTATION.md`
3. Check database: Verify tables and data
4. Test endpoints: Use curl or Postman
5. Review code: Check for custom modifications

## 🎉 Completion

Once all checklist items are complete:

- [ ] Document any custom changes
- [ ] Update team on new auth flow
- [ ] Archive old auth code
- [ ] Update deployment scripts
- [ ] Celebrate! 🎊

---

**Migration Time Estimate:** 30-60 minutes

**Downtime Required:** 5-10 minutes (for database migration)

**Risk Level:** Low (with proper backup)
