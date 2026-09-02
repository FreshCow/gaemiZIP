"use client";

import { useState } from "react";
import { ChevronDown, KeyRound, UserX, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { PasswordChangeSection } from "@/components/auth/PasswordChangeSection";
import { WithdrawSection } from "@/components/auth/WithdrawSection";
import { ChargeRequestSection } from "@/components/auth/ChargeRequestSection";

type Section = "password" | "charge" | "withdraw" | null;

export default function AccountSettingsPage() {
  const provider = useAuthStore((s) => s.provider);
  const [openSection, setOpenSection] = useState<Section>(null);

  const toggle = (section: Section) => setOpenSection((prev) => (prev === section ? null : section));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">계정설정</h1>

      <div className="mx-auto w-[60%] space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => toggle("password")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <KeyRound size={16} className="text-gray-400 dark:text-neutral-500" />
              비밀번호 재설정
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform dark:text-neutral-500 ${
                openSection === "password" ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSection === "password" && (
            <div className="border-t border-gray-100 px-5 py-4 dark:border-neutral-800">
              <PasswordChangeSection provider={provider} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => toggle("charge")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Wallet size={16} className="text-gray-400 dark:text-neutral-500" />
              예수금 충전 신청
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform dark:text-neutral-500 ${
                openSection === "charge" ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSection === "charge" && (
            <div className="border-t border-gray-100 px-5 py-4 dark:border-neutral-800">
              <ChargeRequestSection />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => toggle("withdraw")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-rose-500 dark:text-rose-400">
              <UserX size={16} />
              탈퇴하기
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform dark:text-neutral-500 ${
                openSection === "withdraw" ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSection === "withdraw" && (
            <div className="border-t border-gray-100 px-5 py-4 dark:border-neutral-800">
              <WithdrawSection provider={provider} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
