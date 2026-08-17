"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

const ERROR_TOAST_DURATION_MS = 4000;

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

// 가까이 있는 입력창 바로 위에 잠깐 떴다가 자동으로 사라지는 에러 알림
// 사용하는 곳에서 반드시 부모 요소에 relative를 걸어줘야 그 위치 기준으로 뜬다
export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, ERROR_TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-full z-50 mb-2 flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-rose-200 bg-white p-3 text-sm shadow-lg dark:border-rose-900/40 dark:bg-neutral-800"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
            <p className="text-gray-700 dark:text-neutral-300">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
