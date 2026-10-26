import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = 'http://localhost:8080';
const USERNAME = __ENV.USERNAME;
const PASSWORD = __ENV.PASSWORD;
const STOCK = __ENV.STOCK || '005930';
const PRICE = Number(__ENV.PRICE || 70000);
const QTY = Number(__ENV.QTY || 1);
const VUS = Number(__ENV.VUS || 20);

const buyOk = new Counter('buy_ok');           // 200
const buyBadRequest = new Counter('buy_400');  // 잔고/장시간 등 비즈니스 예외
const buyServerError = new Counter('buy_5xx'); // 동시성 예외 후보

export const options = {
  scenarios: {
    concurrent_buy: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1, // 모든 VU가 setup 직후 동시에 1회씩 주문
      maxDuration: '30s',
    },
  },
};

function login() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD, rememberMe: false }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.json();
}

export function setup() {
  const me = login();
  return { token: me.token, balance0: me.balance };
}

export default function (data) {
  const res = http.post(
    `${BASE}/api/trades`,
    JSON.stringify({
      stockCode: STOCK,
      stockName: 'TEST',
      tradeType: 'BUY',
      price: PRICE,
      quantity: QTY,
    }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` } },
  );
  if (res.status === 200) buyOk.add(1);
  else if (res.status === 400) buyBadRequest.add(1);
  else buyServerError.add(1);
}

// 종료 후 API 기준 정합성 확인
export function teardown(data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}` } };
  const trades = http.get(`${BASE}/api/trades`, auth).json();
  const holdings = http.get(`${BASE}/api/trades/holdings`, auth).json();

  const buys = trades.filter((t) => t.tradeType === 'BUY' && t.stockCode === STOCK).length;
  const holding = holdings.find((h) => h.stockCode === STOCK);
  const holdingQty = holding ? holding.quantity : 0;

  console.log(`[결과] 시작 잔고 = ${data.balance0}`);
  console.log(`[결과] 매수 이력 건수 = ${buys}`);
  console.log(`[결과] 보유 수량 = ${holdingQty} (기대: ${buys * QTY})`);
  console.log(`[결과] 잔고 기대값 = ${data.balance0 - buys * PRICE * QTY} → DB에서 실제 balance와 비교`);
}