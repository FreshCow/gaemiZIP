"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { balanceChargeApi } from "@/services/balanceChargeApi";
import { CHARGE_AMOUNT_OPTIONS, type ChargeAmount } from "@/types/balanceCharge";
import { cn, formatDateTime } from "@/lib/utils";

function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

export function ChargeRequestSection() {
  const [canRequest, setCanRequest] = useState<boolean | null>(null);
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChargeAmount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatus = () => {
    balanceChargeApi
      .getMyChargeStatus()
      .then((res) => {
        setCanRequest(res.canRequest);
        setNextAvailableAt(res.nextAvailableAt);
      })
      .catch((e) => setError(getErrorMessage(e, "충전 신청 상태를 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  };

  useEffect(loadStatus, []);

  const handleSubmit = async () => {
    if (!selected) {
      setError("충전할 금액을 선택해주세요.");
      return;
    }
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await balanceChargeApi.createChargeRequest(selected);
      setSuccess("충전 신청이 접수됐습니다. 관리자 승인 후 잔고에 반영됩니다.");
      setSelected(null);
      loadStatus();
    } catch (e) {
      setError(getErrorMessage(e, "충전 신청에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-400 dark:text-neutral-600">불러오는 중...</p>;
  }

  if (canRequest === false) {
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
        {nextAvailableAt
          ? `다음 신청 가능일: ${formatDateTime(nextAvailableAt)}`
          : "이미 처리 대기중인 신청이 있습니다. 관리자 승인을 기다려주세요."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-neutral-400">
        예수금 충전은 일주일에 한 번, 관리자 승인 후 지급됩니다.
      </p>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
          {success}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {CHARGE_AMOUNT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              "rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
              selected === opt.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Button className="mx-auto flex w-[30%]" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "신청 중..." : "충전 신청"}
      </Button>
    </div>
  );
}
