import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = 'http://localhost:8080';
const CODES = ['005930','000660','035420','035720','051910','005380','006400','068270','207940','323410'];

export const options = {
  scenarios: {
    chart_browsing: {
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
  },
};

export default function () {
  const code = CODES[Math.floor(Math.random() * CODES.length)];
  const res = http.get(`${BASE}/api/stocks/${code}/chart?interval=D`);
  check(res, {
  '200': (r) => r.status === 200,
  '데이터 있음': (r) => { try { return r.json().length > 0; } catch (e) { return false; } },
  });
  sleep(Math.random() * 2 + 1);
}