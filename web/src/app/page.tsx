"use client";

import { useAppStore } from "@/store/useAppStore";
import { StockGrid } from "@/components/stock/StockGrid";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { stocks, holdings, isAutoTrading, toggleAutoTrading } = useAppStore();

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-neutral-500">실시간 거래량 상위 종목</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={toggleAutoTrading}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
            isAutoTrading
              ? "bg-emerald-500 text-black hover:bg-emerald-400"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          }`}
        >
          자동매매 {isAutoTrading ? "ON" : "OFF"}
        </motion.button>
      </div>

      {holdings.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-3 dark:text-neutral-400">보유 종목</h2>
          <div className="flex gap-3 flex-wrap">
            {holdings.map((h) => (
              <div
                key={h.code}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 min-w-36 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <p className="text-xs text-gray-500 dark:text-neutral-500">{h.code}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5 dark:text-white">{h.name}</p>
                <p
                  className={`text-xs mt-1 font-medium ${
                    h.profitRate >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                  }`}
                >
                  {h.profitRate >= 0 ? "+" : ""}
                  {h.profitRate.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-neutral-400">거래량 상위 10</h2>
          <Badge variant="outline" className="border-gray-300 text-gray-400 text-xs dark:border-neutral-700 dark:text-neutral-500">
            실시간
          </Badge>
        </div>
        <StockGrid stocks={stocks} isLoading={stocks.length === 0} />
      </section>
    </div>
  );
}
