import api from "./api";
import type { LoginRequest, SignUpRequest, AuthResponse } from "@/types/auth";

export const authApi = {
  login: (dto: LoginRequest) =>
    api.post<AuthResponse>("/auth/login", dto).then((r) => r.data),

  signUp: (dto: SignUpRequest) =>
    api.post<string>("/auth/signup", dto).then((r) => r.data),

  googleLogin: (idToken: string) =>
    api.post<AuthResponse>("/auth/google", { idToken }).then((r) => r.data),

  verifyPassword: (password: string) =>
    api.post<void>("/auth/verify-password", { password }),

  withdraw: () =>
    api.delete<string>("/auth/me"),
};
