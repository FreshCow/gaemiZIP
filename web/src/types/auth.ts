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
}
