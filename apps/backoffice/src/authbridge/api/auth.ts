/**
 * Authentication API Client
 */

const API_BASE = '/api/auth';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LoginResponse {
  session: string;
  challengeName: string;
  message: string;
}

interface VerifyOtpResponse {
  user: User;
  tokens: AuthTokens;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
}

export const authApi = {
  async login(email: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<LoginResponse>(response);
  },

  async verifyOtp(email: string, otp: string, session: string): Promise<VerifyOtpResponse> {
    const response = await fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, session }),
    });
    return handleResponse<VerifyOtpResponse>(response);
  },

  async refreshToken(refreshToken: string): Promise<Partial<AuthTokens>> {
    const response = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return handleResponse<Partial<AuthTokens>>(response);
  },

  async logout(accessToken: string): Promise<void> {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  async getMe(accessToken: string): Promise<User> {
    const response = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return handleResponse<User>(response);
  },
};
