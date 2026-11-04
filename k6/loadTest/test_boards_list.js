import http from 'k6/http';
import { check } from 'k6';
// 게시글 100만 건 기준 목록·인기글 조회 (페이징 적용 후)
export const options = { scenarios: { s: { executor: 'constant-vus', vus: 30, duration: '30s' } } };
export default function () {
  const page = Math.floor(Math.random() * 50);
  const r1 = http.get(`http://localhost:8080/api/boards?page=${page}&size=20`, { timeout: '30s' });
  check(r1, { 'list 200': (x) => x.status === 200 });
  const r2 = http.get('http://localhost:8080/api/boards/popular', { timeout: '30s' });
  check(r2, { 'popular 200': (x) => x.status === 200 });
}
