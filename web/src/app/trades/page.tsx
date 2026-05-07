"use client";

import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";

export default function TradesPage() {
  const tradeHistories = useAppStore((s) => s.tradeHistories);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">거래 이력</h1>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">종목</th>
              <th className="px-4 py-3 text-left font-medium">유형</th>
              <th className="px-4 py-3 text-right font-medium">가격</th>
              <th className="px-4 py-3 text-right font-medium">수량</th>
              <th className="px-4 py-3 text-right font-medium">체결일시</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistories.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 transition-colors hover:bg-gray-100/60 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40">
                <td className="px-4 py-3 text-gray-900 dark:text-white">
                  <p className="font-medium">{t.stockName}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-500">{t.stockCode}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      t.tradeType === "BUY"
                        ? "border-emerald-700 text-emerald-500 dark:text-emerald-400"
                        : "border-rose-700 text-rose-500 dark:text-rose-400"
                    }
                  >
                    {t.tradeType === "BUY" ? "매수" : "매도"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {t.price.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-neutral-300">{t.quantity}주</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-neutral-500">{t.tradeAt}</td>
              </tr>
            ))}
            {tradeHistories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-neutral-600">
                  거래 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
