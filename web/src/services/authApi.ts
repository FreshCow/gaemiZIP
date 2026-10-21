import api from "./api";
import type {
  AuthResponse,
  FindPasswordRequest,
  KakaoLoginRequest,
  LoginRequest,
  SignUpRequest,
  SignUpResponse,
  VerifySecurityCodeRequest,
} from "@/types/auth";

export const authApi = {
  login: (dto: LoginRequest) =>
    api.post<AuthResponse>("/auth/login", dto).then((r) => r.data),

  signUp: (dto: SignUpRequest) =>
    api.post<SignUpResponse>("/auth/signup", dto).then((r) => r.data),

  findPassword: (dto: FindPasswordRequest) =>
    api.post<void>("/auth/find-password", dto).then((r) => r.data),

  verifySecurityCode: (dto: VerifySecurityCodeRequest) =>
    api.post<void>("/auth/verify-security-code", dto).then((r) => r.data),

  googleLogin: (idToken: string) =>
    api.post<AuthResponse>("/auth/google", { idToken }).then((r) => r.data),

  kakaoLogin: (dto: KakaoLoginRequest) =>
    api.post<AuthResponse>("/auth/kakao", dto).then((r) => r.data),

  verifyPassword: (password: string) =>
    api.post<void>("/auth/verify-password", { password }),

  withdraw: () =>
    api.delete<string>("/auth/me"),

  logout: () =>
    api.post<void>("/auth/logout"),

  heartbeat: () =>
    api.post<void>("/auth/heartbeat"),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<void>("/auth/password", { currentPassword, newPassword }),
};
