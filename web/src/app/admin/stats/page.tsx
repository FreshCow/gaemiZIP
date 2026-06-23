"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { adminApi } from "@/services/adminApi";
import type { SignupTrendItem, TradeVolumeItem } from "@/types/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AdminStatsPage() {
  const [signupTrend, setSignupTrend] = useState<SignupTrendItem[]>([]);
  const [tradeVolume, setTradeVolume] = useState<TradeVolumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminApi.getSignupTrend(30), adminApi.getTradeVolume(30)])
      .then(([signup, trade]) => {
        setSignupTrend(signup);
        setTradeVolume(trade);
      })
      .catch(() => setError("통계 데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>일별 가입자 추이 (최근 30일)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {loading ? (
              <p className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-neutral-600">불러오는 중...</p>
            ) : signupTrend.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-neutral-600">데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-neutral-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="가입자 수" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>일별 거래량 / 거래대금 (최근 30일)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {loading ? (
              <p className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-neutral-600">불러오는 중...</p>
            ) : tradeVolume.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-neutral-600">데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tradeVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-neutral-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="amount" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar yAxisId="count" dataKey="count" name="거래 건수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="amount" type="monotone" dataKey="totalAmount" name="거래대금" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
