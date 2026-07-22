"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminTradeItem } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

export default function AdminTradesPage() {
  const [trades, setTrades] = useState<AdminTradeItem[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(trades.length / PAGE_SIZE);
  const pagedTrades = trades.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    adminApi.getTrades().then(setTrades).catch((e) => setError(getErrorMessage(e, "거래 내역을 불러오지 못했습니다.")));
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("해당 거래 기록을 삭제하시겠습니까? 잔고/보유종목은 자동으로 롤백되지 않습니다.")) return;
    try {
      await adminApi.deleteTrade(id);
      setTrades((prev) => {
        const next = prev.filter((t) => t.id !== id);
        const lastPage = Math.max(0, Math.ceil(next.length / PAGE_SIZE) - 1);
        if (page > lastPage) setPage(lastPage);
        return next;
      });
    } catch (e) {
      setError(getErrorMessage(e, "거래 기록 삭제에 실패했습니다."));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 dark:text-neutral-600">
        거래 보정은 기록 삭제만 수행하며 회원의 잔고·보유종목은 별도로 조정해야 합니다.
      </p>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">회원ID</th>
              <th className="px-4 py-3 text-left font-medium">종목</th>
              <th className="px-4 py-3 text-left font-medium">유형</th>
              <th className="px-4 py-3 text-right font-medium">가격</th>
              <th className="px-4 py-3 text-right font-medium">수량</th>
              <th className="px-4 py-3 text-right font-medium">체결일시</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {pagedTrades.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 transition-colors hover:bg-gray-100/60 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40">
                <td className="px-4 py-3 text-gray-500 dark:text-neutral-400">{t.memberId ?? "-"}</td>
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
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{t.price.toLocaleString()}원</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-neutral-300">{t.quantity}주</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-neutral-500">{t.tradeTime?.slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" className="text-rose-500 hover:text-rose-600" onClick={() => handleDelete(t.id)}>
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-neutral-600">
                  거래 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
