"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { StockItem } from "@/types/stock";

interface Props {
  stock: StockItem;
  onClick: () => void;
  layoutId: string;
}

export function StockCard({ stock, onClick, layoutId }: Props) {
  const isPositive = !stock.rate.startsWith("-");

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
        <div>
          <p className="text-xs text-gray-500 dark:text-neutral-500">{stock.code}</p>
          <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">{stock.name}</p>
        </div>
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
