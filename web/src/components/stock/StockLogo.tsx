"use client";

import { useState } from "react";

// logo.dev publishable key — client-side에 노출돼도 안전한 키
const LOGO_DEV_TOKEN = "pk_cyvpNwXpSWuQipt7pBOxeQ";

interface StockLogoProps {
  code: string;
  name: string;
  className?: string;
}

// 종목명 첫 글자로 배경색을 정해 로고 없는 종목의 대체 아이콘에 일관되게 사용
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 45%, 42%)`;
}

// 종목코드(KRX 6자리)로 회사 로고를 조회. name 기반 검색은 유사 상호와 오매칭되는
// 문제가 있어(예: "삼성전자" → 무관한 회사) ticker 방식(.KS 접미사)을 사용.
// logo.dev 자체 모노그램 폴백은 종목코드 첫 글자를 이니셜로 써서 의미가 없으므로
// fallback=404로 매칭 실패를 감지해 종목명 첫 글자로 직접 대체 아이콘을 그림.
export function StockLogo({ code, name, className = "" }: StockLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full text-sm font-bold text-white ${className}`}
        style={{ backgroundColor: nameToColor(name) }}
      >
        {name.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={`https://img.logo.dev/ticker/${code}.KS?token=${LOGO_DEV_TOKEN}&size=64&format=webp&fallback=404`}
      alt=""
      onError={() => setFailed(true)}
      className={`rounded-full object-cover ${className}`}
    />
  );
}
