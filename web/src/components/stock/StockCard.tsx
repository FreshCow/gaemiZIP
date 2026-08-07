"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorite } from "@/hooks/useFavorite";
import type { StockItem } from "@/types/stock";

interface Props {
  stock: StockItem;
  onClick: () => void;
  layoutId: string;
}

export function StockCard({ stock, onClick, layoutId }: Props) {
  const isPositive = !stock.rate.startsWith("-");
  const { isFavorite, toggleFavorite } = useFavorite();

  // 서버와 클라이언트의 첫 렌더 트리를 일치시키기 위해 마운트 후에만 watchlist 상태를 반영
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const isWatched = isMounted && isFavorite(stock.code);

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-neutral-500">{stock.code}</p>
          <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white truncate">{stock.name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(stock.code, stock.name); }}
            className={`rounded-full p-1 transition-colors ${
              isWatched
                ? "text-yellow-400"
                : "text-gray-300 hover:text-yellow-400 dark:text-neutral-600 dark:hover:text-yellow-400"
            }`}
            aria-label={isWatched ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            <Star size={14} fill={isWatched ? "currentColor" : "none"} />
          </button>
          <Badge
            variant="outline"
            className={
              isPositive
                ? "border-emerald-700 text-emerald-500 dark:text-emerald-400"
                : "border-rose-700 text-rose-500 dark:text-rose-400"
            }
          >
            {stock.rate}%
          </Badge>
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
        {Number(stock.price).toLocaleString()}
        <span className="ml-1 text-sm font-normal text-gray-500 dark:text-neutral-400">원</span>
      </p>

      {stock.volume > 0 && (
        <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
          거래량 {stock.volume.toLocaleString()}
        </p>
      )}
    </motion.div>
  );
}
