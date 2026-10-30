export interface Token {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface TokenRefresh {
  refresh_token: string;
}

export interface TokenPayload {
  sub?: string;
  role?: string;
  family_id?: string;
  jti?: string;
  exp?: number;
  type?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  role: string;
  user_type: string;
  agent_code?: string;
}

export type LogoutRequest = Record<string, never>;
