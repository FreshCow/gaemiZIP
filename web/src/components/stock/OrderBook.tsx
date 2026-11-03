"use client";

import type { OrderBookData, OrderBookLevel } from "@/types/stock";

interface OrderBookProps {
  data: OrderBookData | null;
  currentPrice: number;
  onSelectPrice: (price: number) => void;
}

const EMPTY_LEVELS: OrderBookLevel[] = Array.from({ length: 10 }, () => ({ price: 0, quantity: 0 }));

// 매수/매도 주문 카드 좌측에 배치되는 10단계 호가창 — 위: 매도(10→1호가), 가운데: 현재가, 아래: 매수(1→10호가)
export function OrderBook({ data, currentPrice, onSelectPrice }: OrderBookProps) {
  const asks = data?.asks?.length ? data.asks : EMPTY_LEVELS;
  const bids = data?.bids?.length ? data.bids : EMPTY_LEVELS;
  const maxQty = Math.max(1, ...asks.map((l) => l.quantity), ...bids.map((l) => l.quantity));
  const totalAskQty = data?.totalAskQty ?? 0;
  const totalBidQty = data?.totalBidQty ?? 0;
  const totalQty = totalAskQty + totalBidQty;
  const bidRatio = totalQty > 0 ? (totalBidQty / totalQty) * 100 : 50;

  // 매도호가는 10호가(현재가에서 가장 멀음)부터 1호가(현재가와 가장 가까움) 순으로 위→아래 표시
  const askRows = [...asks].reverse();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-800">
      <div className="divide-y divide-gray-50 dark:divide-neutral-800/60">
        {askRows.map((level, i) => (
          <OrderBookRow key={`ask-${i}`} level={level} maxQty={maxQty} side="ASK" onSelect={onSelectPrice} />
        ))}
      </div>

      <div className="flex items-center justify-center border-y border-gray-200 bg-gray-50 py-1.5 text-sm font-bold text-gray-900 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-white">
        {currentPrice > 0 ? `${currentPrice.toLocaleString()}원` : "—"}
      </div>

      <div className="divide-y divide-gray-50 dark:divide-neutral-800/60">
        {bids.map((level, i) => (
          <OrderBookRow key={`bid-${i}`} level={level} maxQty={maxQty} side="BID" onSelect={onSelectPrice} />
        ))}
      </div>

      {totalQty > 0 && (
        <div className="border-t border-gray-200 px-2 py-2 dark:border-neutral-800">
          <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums">
            <span className="font-medium text-blue-600 dark:text-blue-400">매도 {totalAskQty.toLocaleString()}</span>
            <span className="font-medium text-rose-600 dark:text-rose-400">매수 {totalBidQty.toLocaleString()}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-blue-400 dark:bg-blue-500">
            <div className="ml-auto h-full bg-rose-500 dark:bg-rose-400" style={{ width: `${bidRatio}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function OrderBookRow({
  level,
  maxQty,
  side,
  onSelect,
}: {
  level: OrderBookLevel;
  maxQty: number;
  side: "ASK" | "BID";
  onSelect: (price: number) => void;
}) {
  const isAsk = side === "ASK";
  const hasPrice = level.price > 0;
  const barWidth = level.quantity > 0 ? Math.max(4, (level.quantity / maxQty) * 100) : 0;

  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={() => onSelect(level.price)}
      className="relative flex w-full items-center justify-between px-2 py-1 text-xs transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-neutral-800/60"
    >
      <div
        className={`absolute inset-y-0 right-0 ${isAsk ? "bg-blue-100 dark:bg-blue-950/40" : "bg-rose-100 dark:bg-rose-950/40"}`}
        style={{ width: `${barWidth}%` }}
      />
      <span className={`relative font-medium tabular-nums ${isAsk ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
        {hasPrice ? level.price.toLocaleString() : "—"}
      </span>
      <span className="relative tabular-nums text-gray-600 dark:text-neutral-400">
        {level.quantity > 0 ? level.quantity.toLocaleString() : ""}
      </span>
    </button>
  );
}
