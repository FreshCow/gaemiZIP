"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StockCard } from "./StockCard";
import { StockDetail } from "./StockDetail";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockItem } from "@/types/stock";

interface Props {
  stocks: StockItem[];
  isLoading?: boolean;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

export function StockGrid({ stocks, isLoading }: Props) {
  const [selected, setSelected] = useState<StockItem | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl bg-gray-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  const selectedLayoutId = selected ? `stock-card-${selected.code}` : "";

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5"
      >
        {stocks.map((stock) => (
          <motion.div key={stock.code} variants={item}>
            <StockCard
              stock={stock}
              layoutId={`stock-card-${stock.code}`}
              onClick={() => setSelected(stock)}
            />
          </motion.div>
        ))}
      </motion.div>

      <StockDetail
        stock={selected}
        layoutId={selectedLayoutId}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
