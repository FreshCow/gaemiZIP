"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Sparkles,
  ChevronLeft,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import { fetchStockInfo } from "@/services/stockApi";
import { tradeApi } from "@/services/tradeApi";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { StockInfoData, HoldingItem } from "@/types/stock";

// ── Mock 뉴스 (종목별 뉴스 API 미제공) ────────────────────────────────────────

const MOCK_NEWS = [
  { id: 1, title: "삼성전자, HBM4 양산 일정 앞당겨…엔비디아 공급 확정", publisher: "한국경제", time: "2시간 전" },
  { id: 2, title: "삼성전자 2분기 영업이익 8조 전망…반도체 회복 가속",  publisher: "매일경제", time: "4시간 전" },
  { id: 3, title: "외국인, 삼성전자 3거래일 연속 순매수…8,000억 규모",  publisher: "이데일리", time: "6시간 전" },
  { id: 4, title: "삼성전자, 파운드리 고객사 다변화…TSMC 추격 본격화",  publisher: "조선비즈",  time: "어제"   },
];

// ── 유틸 ────────────────────────────────────────────────────────────────────────

function absNum(val: string | undefined): number {
  if (!val) return 0;
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")));
}

function isUp(val: string | undefined): boolean {
  if (!val) return true;
  return !val.trim().startsWith("-");
}

function fmt(val: string | undefined, suffix = ""): string {
  if (!val || val === "0" || val.trim() === "") return "—";
  const n = absNum(val);
  return n > 0 ? `${n.toLocaleString()}${suffix}` : "—";
}

// ── 정보 행 컴포넌트 ───────────────────────────────────────────────────────────

function InfoRow({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  const up = isUp(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-neutral-500">{label}</span>
      <span className={`text-xs font-medium ${colored ? (up ? "text-emerald-500" : "text-rose-500") : "text-gray-900 dark:text-white"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

export default function StockDetailPage() {
  const params = useParams();
  const code = (params?.code as string) ?? "";

  const [info, setInfo] = useState<StockInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // 매매 패널 상태
  const [tab, setTab] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 인증 / 보유 / 실시간 가격
  const { isLoggedIn, balance, updateBalance } = useAuthStore();
  const setHoldings = useAppStore((s) => s.setHoldings);
  const holding = useAppStore((s) => s.holdings.find((h) => h.code === code));
  const latestTick = useAppStore((s) => s.latestTick);

  // 실시간 랭킹에서 현재가 fallback
  const rankStock = useAppStore((s) => s.stocks.find((s) => s.code === code));

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(false);
    fetchStockInfo(code)
      .then(setInfo)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [code]);

  // curPric이 "0" 또는 "0.00"이면 랭킹 데이터로 fallback
  const apiPrice  = absNum(info?.curPric);
  const curPrice  = apiPrice > 0 ? apiPrice : absNum(rankStock?.price);
  const apiRate   = info?.fluRt && info.fluRt !== "0" ? info.fluRt : rankStock?.rate ?? "0";
  const predPre   = absNum(info?.predPre);
  const fluRt     = apiRate;
  const priceUp   = isUp(fluRt);

  // 매매 체결 기준가: WebSocket 틱 > 현재가 순으로 우선
  const tradePrice = (latestTick?.code === code && latestTick.price > 0)
    ? latestTick.price
    : curPrice;

  const handleTrade = async () => {
    if (!tradePrice || qty < 1) return;
    setIsTrading(true);
    setTradeMsg(null);
    try {
      const result = await tradeApi.executeTrade({
        stockCode: code,
        stockName: info?.name ?? rankStock?.name ?? code,
        tradeType: tab,
        price: tradePrice,
        quantity: qty,
      });
      if (result.newBalance != null) updateBalance(result.newBalance);
      // 보유 종목 서버에서 재동기화
      const fresh = await tradeApi.getHoldings();
      setHoldings(fresh.map((h) => ({
        code: h.stockCode,
        name: h.stockName,
        buyPrice: h.avgPrice,
        currentPrice: h.avgPrice,
        quantity: h.quantity,
        profitRate: 0,
      } as HoldingItem)));
      setTradeMsg({ type: "ok", text: tab === "BUY" ? "매수 완료" : "매도 완료" });
      setQty(1);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? "거래 처리 중 오류가 발생했습니다.";
      setTradeMsg({ type: "err", text: msg });
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* 뒤로가기 */}
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-500 dark:hover:text-neutral-200 transition-colors"
      >
        <ChevronLeft size={16} />
        AI 탐색으로 돌아가기
      </Link>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center h-64 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30">
          <p className="text-sm text-rose-500 dark:text-rose-400">종목 정보를 불러오지 못했습니다.</p>
        </div>
      )}

      {!loading && info && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">

          {/* ── 좌측 ────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* 종목 헤더 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 rounded px-2 py-0.5 dark:bg-neutral-800 dark:text-neutral-400">
                      {info.market || "KOSPI"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-neutral-500">{code}</span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{info.name}</h1>
                </div>

                <button
                  onClick={() => setIsFavorite((p) => !p)}
                  className="flex flex-col items-center gap-0.5 transition-transform active:scale-90"
                >
                  <Star
                    size={26}
                    className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-neutral-600"}
                  />
                </button>
              </div>

              {/* 현재가 */}
              <div className="mt-4 flex items-end gap-3">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {curPrice > 0 ? curPrice.toLocaleString() : "시세 없음"}
                  <span className="ml-1 text-xl font-medium text-gray-400 dark:text-neutral-500">
                    {curPrice > 0 ? "원" : ""}
                  </span>
                </span>
                {curPrice > 0 && fluRt !== "0" && (
                  <div className={`flex items-center gap-1 pb-1 text-lg font-semibold ${priceUp ? "text-emerald-500" : "text-rose-500"}`}>
                    {priceUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    <span>
                      {predPre > 0 ? `${priceUp ? "+" : "-"}${predPre.toLocaleString()}원 ` : ""}
                      ({priceUp ? "+" : ""}{fluRt}%)
                    </span>
                  </div>
                )}
              </div>

              {info.basePric && info.basePric !== "0" && (
                <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
                  기준가 {absNum(info.basePric).toLocaleString()}원
                </p>
              )}

              {/* 오늘 OHLC + 상하한가 */}
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "시가",   val: info.openPric },
                  { label: "고가",   val: info.highPric },
                  { label: "저가",   val: info.lowPric  },
                  { label: "상한가", val: info.uptPric  },
                  { label: "하한가", val: info.lstPric  },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-neutral-800">
                    <p className="text-[10px] text-gray-400 dark:text-neutral-500">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 차트 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">주가 차트</h2>
              <div className="h-72">
                <CandlestickChart stockCode={code} />
              </div>
            </div>

            {/* 재무·시장 지표 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">재무 지표</h2>
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow label="PER"       value={info.per  || "—"} />
                  <InfoRow label="EPS"       value={info.eps  || "—"} />
                  <InfoRow label="ROE"       value={info.roe  || "—"} />
                  <InfoRow label="PBR"       value={info.pbr  || "—"} />
                  <InfoRow label="BPS"       value={fmt(info.bps)} />
                  <InfoRow label="EV"        value={info.ev   || "—"} />
                </div>
                <div>
                  <InfoRow label="매출액"       value={fmt(info.saleAmt, "억")} />
                  <InfoRow label="영업이익"     value={fmt(info.busPro,  "억")} />
                  <InfoRow label="당기순이익"   value={fmt(info.cupNga,  "억")} />
                  <InfoRow label="시가총액"     value={fmt(info.mac,     "억")} />
                  <InfoRow label="자본금"       value={fmt(info.cap,     "억")} />
                  <InfoRow label="신용비율"     value={info.crdRt || "—"} />
                </div>
              </div>
            </div>

            {/* AI 종목 분석 */}
            <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-5 shadow-sm dark:border-violet-900/50 dark:from-violet-950/40 dark:to-purple-950/40">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" />
                <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">AI 종목 분석</span>
                <span className="ml-auto rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-500 dark:bg-violet-900/50 dark:text-violet-400">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                최근 반도체 수요 증가와 외국인 매수세로 인해{" "}
                <strong>단기 상승 랠리</strong> 중입니다. HBM4 공급 계약 확정으로
                메모리 사업부 실적 개선이 기대되며, 기술적으로는{" "}
                <strong>75,000원 지지선</strong>을 확인 후 추가 상승 가능성이 높습니다.
              </p>
            </div>
          </div>

          {/* ── 우측 ────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* 모의매매 패널 */}
            {isLoggedIn && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-4 text-sm font-medium text-gray-700 dark:text-neutral-300">모의매매</h2>

                {/* 매수/매도 탭 */}
                <div className="flex mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                  {(["BUY", "SELL"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setTradeMsg(null); }}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${
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

                {/* 체결 기준가 */}
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-gray-500 dark:text-neutral-500">체결 기준가</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {tradePrice > 0 ? `${tradePrice.toLocaleString()}원` : "—"}
                  </span>
                </div>

                {/* 잔고 or 보유 수량 */}
                <div className="flex justify-between text-xs mb-4">
                  {tab === "BUY" ? (
                    <>
                      <span className="text-gray-500 dark:text-neutral-500">주문 가능 잔고</span>
                      <span className="font-medium text-gray-700 dark:text-neutral-300">
                        {(balance ?? 0).toLocaleString()}원
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500 dark:text-neutral-500">보유 수량</span>
                      <span className="font-medium text-gray-700 dark:text-neutral-300">
                        {holding?.quantity ?? 0}주
                      </span>
                    </>
                  )}
                </div>

                {/* 수량 입력 */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-center text-sm font-medium text-gray-900 outline-none dark:border-neutral-700 dark:text-white"
                  />
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    +
                  </button>
                </div>

                {/* 예상 금액 */}
                <div className="flex justify-between text-xs mb-4 rounded-lg bg-gray-50 px-3 py-2 dark:bg-neutral-800">
                  <span className="text-gray-500 dark:text-neutral-500">
                    예상 {tab === "BUY" ? "매수" : "매도"}금액
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(tradePrice * qty).toLocaleString()}원
                  </span>
                </div>

                {/* 결과 메시지 */}
                {tradeMsg && (
                  <p className={`mb-3 text-xs text-center ${tradeMsg.type === "ok" ? "text-emerald-500" : "text-rose-500"}`}>
                    {tradeMsg.text}
                  </p>
                )}

                {/* 실행 버튼 */}
                <button
                  onClick={handleTrade}
                  disabled={isTrading || tradePrice === 0}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    tab === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-rose-500 hover:bg-rose-600"
                  }`}
                >
                  {isTrading ? "처리 중..." : tab === "BUY" ? "매수하기" : "매도하기"}
                </button>
              </div>
            )}

            {/* 시장 정보 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">시장 정보</h2>
              <InfoRow label="거래량"       value={fmt(info.trdeQty, "주")} />
              <InfoRow label="거래대금"     value={fmt(info.trdePre, "원")} />
              <InfoRow label="외인소진율"   value={info.forExhRt ? `${info.forExhRt}%` : "—"} />
              <InfoRow label="연중최고"     value={fmt(info.oyrHgst)} colored />
              <InfoRow label="연중최저"     value={fmt(info.oyrLwst)} colored />
              <InfoRow label="250일최고"    value={`${fmt(info.hgst250)} (${info.hgst250PricDt || "—"}일 전)`} />
              <InfoRow label="250일최저"    value={`${fmt(info.lwst250)} (${info.lwst250PricDt || "—"}일 전)`} />
              <InfoRow label="결산월"       value={info.setlMm ? `${info.setlMm}월` : "—"} />
              <InfoRow label="매매단위"     value={info.favUnit ? `${info.favUnit}주` : "—"} />
              <InfoRow label="대용가"       value={fmt(info.replPric)} />
            </div>

            {/* 관련 뉴스 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center gap-2">
                <Newspaper size={16} className="text-gray-400 dark:text-neutral-500" />
                <h2 className="text-sm font-medium text-gray-700 dark:text-neutral-300">관련 뉴스</h2>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                {MOCK_NEWS.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium leading-snug text-gray-800 hover:text-blue-600 dark:text-neutral-200 dark:hover:text-blue-400 cursor-pointer transition-colors line-clamp-2">
                      {item.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                      <span>{item.publisher}</span>
                      <span>·</span>
                      <Clock size={11} />
                      <span>{item.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
