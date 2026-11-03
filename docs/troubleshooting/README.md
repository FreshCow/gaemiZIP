# 트러블슈팅

| 사례 | 문제 → 해결 |
|---|---|
| [1. 동시성 결함](01-concurrency.md) | 같은 데이터 동시 수정 시 값 유실 → 비관적 락 + 유니크 제약 |
| [2. 캐시 스탬피드](02-cache-stampede.md) | 외부 API 429로 조회 실패 → 동일 요청 병합 |
| [3. WebSocket 동시 전송](03-websocket-broadcast.md) | 틱 유실·전송 지연 → 세션별 직렬화 + 비동기 전송 |

[← README로 돌아가기](../../README.md)
