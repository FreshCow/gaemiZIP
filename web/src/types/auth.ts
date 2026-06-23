export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  nickname: string;
  balance: number;
  provider: string;
  role: string; // "ROLE_USER" | "ROLE_ADMIN"
}
