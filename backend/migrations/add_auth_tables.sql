-- Migration: Add Authentication Tables
-- Created: 2026-02-20
-- Description: Adds token blacklist and user session tables for robust authentication

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Token Blacklist Table
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('access', 'refresh')),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Indexes for performance
    CONSTRAINT idx_token_blacklist_jti UNIQUE (jti)
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_jti VARCHAR(255) UNIQUE NOT NULL,
    access_token_jti VARCHAR(255),
    
    -- Device/Client Info
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),  -- IPv6 compatible
    device_fingerprint VARCHAR(255),
    
    -- Session Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(255),
    
    -- Indexes for performance
    CONSTRAINT idx_user_sessions_refresh_jti UNIQUE (refresh_token_jti)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Add indexes to users table if not exists
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Comments for documentation
COMMENT ON TABLE token_blacklist IS 'Stores revoked JWT tokens to prevent reuse';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for security and audit';
COMMENT ON COLUMN token_blacklist.jti IS 'JWT ID - unique identifier for each token';
COMMENT ON COLUMN user_sessions.refresh_token_jti IS 'JTI of the refresh token for this session';
COMMENT ON COLUMN user_sessions.device_fingerprint IS 'Optional device fingerprint for enhanced security';
