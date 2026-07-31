export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  passwordConfirm: string;
}

export interface SignUpResponse {
  securityCode: string;
}

export interface FindPasswordRequest {
  username: string;
  securityCode: string;
  newPassword: string;
}

export interface VerifySecurityCodeRequest {
  username: string;
  securityCode: string;
}

export interface AuthResponse {
  token: string;
  nickname: string;
  balance: number;
  provider: string;
  role: string; // "ROLE_USER" | "ROLE_ADMIN"
}
