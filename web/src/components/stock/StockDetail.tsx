"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import type { StockItem } from "@/types/stock";

interface Props {
  stock: StockItem | null;
  layoutId: string;
  onClose: () => void;
}

export function StockDetail({ stock, layoutId, onClose }: Props) {
  const isPositive = stock && !stock.rate.startsWith("-");

  return (
    <AnimatePresence>
      {stock && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* 상세 카드 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              layoutId={layoutId}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="relative w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            >
              <button
                onClick={onClose}
                className="absolute right-5 top-5 text-gray-400 transition-colors hover:text-gray-900 dark:text-neutral-500 dark:hover:text-white"
              >
                <X size={20} />
              </button>

              <p className="text-xs text-gray-500 dark:text-neutral-500">{stock.code}</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stock.name}</h2>

              <div className="mt-4 flex items-end gap-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {Number(stock.price).toLocaleString()}원
                </span>
                <span
                  className={`text-lg font-semibold ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}
                >
                  {stock.rate}%
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
                거래량 {stock.volume.toLocaleString()}
              </p>

              <div className="mt-6 h-72 w-full">
                <CandlestickChart stockCode={stock.code} />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
