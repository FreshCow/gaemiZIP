import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = 'http://localhost:8080';
const CODES = ['005930','000660','035420','035720','051910','005380','006400','068270','207940','323410'];

export const options = {
  scenarios: {
    detail_page_browsing: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};


export default function () {
  const code = CODES[Math.floor(Math.random() * CODES.length)];
  const res = http.batch([
    ['GET', `${BASE}/api/stocks/${code}/info`],
    ['GET', `${BASE}/api/stocks/${code}/price`],
    ['GET', `${BASE}/api/stocks/${code}/news`],
    ['GET', `${BASE}/api/ai/stock/${code}`],
  ]);
  res.forEach((r) => check(r, { '200': (x) => x.status === 200 }));
  sleep(Math.random() * 2 + 1);
}


// export function stampedeCheck() {
//   const res = http.get(`${BASE}/api/stocks/005930/info`);
//   check(res, { 'no 404 (캐시 스탬피드 재발 없음)': (r) => r.status === 200 });
// }