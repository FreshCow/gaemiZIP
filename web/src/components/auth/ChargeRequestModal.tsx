"use client";

import { X } from "lucide-react";
import { ChargeRequestSection } from "./ChargeRequestSection";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChargeRequestModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">예수금 충전 신청</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        <ChargeRequestSection />
      </div>
    </div>
  );
}
