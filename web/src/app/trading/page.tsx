"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import { StockSearchBar } from "@/components/stock/StockSearchBar";
import { tradeApi } from "@/services/tradeApi";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { StockSearchResult, HoldingItem } from "@/types/stock";

async function reloadHoldings(setHoldings: (h: HoldingItem[]) => void) {
  const fresh = await tradeApi.getHoldings();
  const stocks = useAppStore.getState().stocks;
  setHoldings(
    fresh.map((h) => {
      const stock = stocks.find((s) => s.code === h.stockCode);
      const currentPrice = stock ? Number(stock.price) : h.avgPrice;
      return {
        code: h.stockCode,
        name: h.stockName,
        buyPrice: h.avgPrice,
        currentPrice,
        quantity: h.quantity,
        profitRate: h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0,
      };
    })
  );
}

const RATIOS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
];

export default function TradingPage() {
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
  const [tab, setTab]           = useState<"BUY" | "SELL">("BUY");
  const [orderPrice, setOrderPrice] = useState("");
  const [qty, setQty]           = useState("");
  const [isTrading, setIsTrading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const stock      = useAppStore((s) => selected ? s.stocks.find((x) => x.code === selected.code) : null);
  const holding    = useAppStore((s) => selected ? s.holdings.find((h) => h.code === selected.code) : null);
  const latestTick = useAppStore((s) => s.latestTick);
  const setHoldings = useAppStore((s) => s.setHoldings);
  const { isLoggedIn, balance, updateBalance } = useAuthStore();

  // 체결 기준가: WebSocket 틱 > 랭킹 캐시
  // latestTick=null & selected=null 이면 undefined===undefined → true 가 되어
  // latestTick.price 에 접근하므로, null 체크를 먼저 수행해야 함
  const currentPrice =
    latestTick != null && selected != null && latestTick.code === selected.code && latestTick.price > 0
      ? latestTick.price
      : Number(stock?.price ?? 0);

  const isUp = !stock?.rate?.startsWith("-");

  // 종목 변경 시 폼 초기화
  useEffect(() => {
    if (!selected) return;
    setTab("BUY");
    setOrderPrice(currentPrice > 0 ? String(currentPrice) : "");
    setQty("");
    setTradeMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.code]);

  const orderPriceNum = Math.max(0, Number(orderPrice.replace(/,/g, "")) || 0);
  const qtyNum        = Math.max(0, Number(qty) || 0);
  const totalAmount   = orderPriceNum * qtyNum;

  // 비율 버튼: 매수 → 잔고 기준, 매도 → 보유수량 기준
  const handleRatio = (ratio: number) => {
    if (orderPriceNum <= 0 && tab === "BUY") return;
    if (tab === "BUY") {
      const maxQty = Math.floor(((balance ?? 0) * ratio) / orderPriceNum);
      setQty(String(maxQty));
    } else {
      const maxQty = holding?.quantity ?? 0;
      setQty(String(Math.floor(maxQty * ratio)));
    }
  };

  const canTrade =
    !isTrading &&
    orderPriceNum > 0 &&
    qtyNum > 0 &&
    (tab === "BUY"
      ? totalAmount <= (balance ?? 0)
      : qtyNum <= (holding?.quantity ?? 0));

  const handleTrade = async () => {
    if (!selected || !canTrade) return;
    setIsTrading(true);
    setTradeMsg(null);
    try {
      const result = await tradeApi.executeTrade({
        stockCode: selected.code,
        stockName: selected.name,
        tradeType: tab,
        price: orderPriceNum,
        quantity: qtyNum,
      });
      if (result.newBalance != null) updateBalance(result.newBalance);
      await reloadHoldings(setHoldings);
      setTradeMsg({ type: "ok", text: tab === "BUY" ? "매수 완료" : "매도 완료" });
      setQty("");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "거래 처리 중 오류가 발생했습니다.";
      setTradeMsg({ type: "err", text: msg });
    } finally {
      setIsTrading(false);
    }
  };

  // ── 종목 미선택: 검색 뷰 ──────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">트레이딩</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
              종목을 검색하면 차트와 주문창이 열립니다
            </p>
          </div>
          <StockSearchBar large onSelect={(s: StockSearchResult) => setSelected({ code: s.code, name: s.name })} />
        </div>
      </div>
    );
  }

  // ── 종목 선택: 트레이딩 뷰 ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-6">

      {/* 종목 헤더 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-500 dark:hover:text-neutral-200 transition-colors"
        >
          <ChevronLeft size={16} />
          종목 변경
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{selected.name}</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
            {selected.code}
          </span>
        </div>

        {currentPrice > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {currentPrice.toLocaleString()}원
            </span>
            {stock?.rate && (
              <span className={`text-sm font-semibold ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
                {stock.rate}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 차트 + 주문 패널 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">

        {/* ── 차트 ───────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="h-[550px]">
            <CandlestickChart stockCode={selected.code} />
          </div>
        </div>

        {/* ── 주문 패널 ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col gap-4">

          {/* 매수/매도 탭 */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700">
            {(["BUY", "SELL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setQty(""); setTradeMsg(null); }}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                  tab === t
                    ? t === "BUY"
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white"
                    : "text-gray-500 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {t === "BUY" ? "매수" : "매도"}
              </button>
            ))}
          </div>

          {/* 잔고 / 보유 정보 */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1.5 dark:bg-neutral-800">
            {tab === "BUY" ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-neutral-500">주문 가능 잔고</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₩{(balance ?? 0).toLocaleString()}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-neutral-500">보유 수량</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(holding?.quantity ?? 0).toLocaleString()}주
                  </span>
                </div>
                {holding && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-neutral-500">평균 단가</span>
                      <span className="font-medium text-gray-700 dark:text-neutral-300">
                        ₩{holding.buyPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-neutral-500">평가 손익</span>
                      <span className={`font-semibold ${holding.profitRate >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {holding.profitRate >= 0 ? "+" : ""}{holding.profitRate.toFixed(2)}%
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* 주문 가격 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">주문 가격</label>
              <button
                onClick={() => setOrderPrice(currentPrice > 0 ? String(currentPrice) : "")}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400 transition-colors"
              >
                <RefreshCw size={10} />
                현재가로 설정
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-neutral-700 focus-within:border-emerald-400 dark:focus-within:border-emerald-500 transition-colors">
              <input
                type="number"
                min={1}
                value={orderPrice}
                onChange={(e) => { setOrderPrice(e.target.value); setQty(""); }}
                placeholder="0"
                className="flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
              />
              <span className="shrink-0 text-xs text-gray-400 dark:text-neutral-500">원</span>
            </div>
          </div>

          {/* 수량 + 비율 버튼 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">수량</label>

            {/* 비율 버튼 */}
            <div className="grid grid-cols-3 gap-1.5">
              {RATIOS.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => handleRatio(value)}
                  disabled={tab === "BUY" && orderPriceNum <= 0}
                  className="rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 수량 직접 입력 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => String(Math.max(0, (Number(q) || 0) - 1)))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
              >
                −
              </button>
              <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 dark:border-neutral-700 focus-within:border-emerald-400 dark:focus-within:border-emerald-500 transition-colors">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-semibold text-gray-900 outline-none dark:text-white"
                />
                <span className="shrink-0 text-xs text-gray-400 dark:text-neutral-500">주</span>
              </div>
              <button
                onClick={() => setQty((q) => String((Number(q) || 0) + 1))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* 예상 금액 */}
          <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-neutral-800">
            <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-500 mb-1">
              <span>예상 {tab === "BUY" ? "매수" : "매도"}금액</span>
              <span>
                {tab === "BUY" && balance != null && totalAmount > 0 && (
                  <span className={totalAmount > balance ? "text-rose-500" : "text-gray-400 dark:text-neutral-600"}>
                    잔고의 {((totalAmount / balance) * 100).toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ₩{totalAmount > 0 ? totalAmount.toLocaleString() : "—"}
            </p>
          </div>

          {/* 로그인 안내 / 결과 메시지 */}
          {!isLoggedIn ? (
            <p className="text-center text-xs text-gray-400 dark:text-neutral-600">
              로그인 후 거래할 수 있습니다
            </p>
          ) : tradeMsg ? (
            <p className={`text-center text-sm font-medium ${tradeMsg.type === "ok" ? "text-emerald-500" : "text-rose-500"}`}>
              {tradeMsg.text}
            </p>
          ) : null}

          {/* 실행 버튼 */}
          {isLoggedIn && (
            <button
              onClick={handleTrade}
              disabled={!canTrade}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-40 ${
                tab === "BUY"
                  ? "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
                  : "bg-rose-500 hover:bg-rose-600 active:bg-rose-700"
              }`}
            >
              {isTrading
                ? "처리 중..."
                : tab === "BUY"
                ? `${qtyNum > 0 ? `${qtyNum}주 ` : ""}매수하기`
                : `${qtyNum > 0 ? `${qtyNum}주 ` : ""}매도하기`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
