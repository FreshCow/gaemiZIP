"use client";

import { useAppStore } from "@/store/useAppStore";
import { StockGrid } from "@/components/stock/StockGrid";

export default function StocksPage() {
  const stocks = useAppStore((s) => s.stocks);
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">주식 랭킹</h1>
      <StockGrid stocks={stocks} isLoading={stocks.length === 0} />
    </div>
  );
}
