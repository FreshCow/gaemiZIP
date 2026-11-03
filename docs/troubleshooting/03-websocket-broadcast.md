[← README로 돌아가기](../../README.md) · [트러블슈팅 목록](README.md)

# 3. 실시간 시세 중계 WebSocket 동시 전송 결함

> **요약**: 서버가 키움과 브라우저 사이의 중계 허브로 동작하며 생긴 동시 쓰기 충돌과 느린 세션의 전송 지연을 세션 단위 직렬화와 비동기 전송으로 해결 (정규장 실사용 검증에서 재발 0건)

**배경**
- 선행 단계: 다종목 체결이 몰리면 연결이 30~40초마다 끊김 → 기본 텍스트 메시지 버퍼(8KB) 초과가 원인, 1MB로 확장
- 연결이 오래 유지되면서 문제가 발생

**증상**
1. 연결은 유지되는데 실시간 체결 틱 일부가 유실됨
2. 정규장 실사용 검증 중 일부 세션에서 전송지연 발생 (10분 사이 서로 다른 세션 2건)

**원인**
1. 키움 WebSocket 클라이언트의 I/O 스레드 2개가 같은 브라우저 세션에 동시 쓰기, 세션별 동기화 없이 `sendMessage()` 호출 (선행 단계의 잦은 재연결에 가려져 있던 기존 잠재 버그로 추정)
2. 브로드캐스트가 세션을 순차 블로킹으로 전송, 느린 세션 하나가 뒤 세션과 키움 I/O 스레드를 지연
   - 전송 실패 시 세션을 제거하지 않아 같은 좀비 세션이 반복해서 타임아웃 유발

**해결**
1. 세션 단위 `synchronized`로 동시 쓰기 방지
2. 세션별 전송을 스레드 풀로 비동기 분리, 전송 실패 시 세션 제거와 종료

<details>
<summary>코드: 브로드캐스트 (기존 → 수정)</summary>

기존 (요약)
```java
// StockWebSocketHandler.broadcast
for (WebSocketSession session : sessions) {
    session.sendMessage(new TextMessage(message));   // 세션별 동기화 없음, 호출 스레드에서 순차 블로킹
}                                                    // 실패해도 세션을 목록에서 제거하지 않음
```

수정
```java
public void broadcast(String message) {
    this.lastBroadcastMessage = message;
    if (sessions.isEmpty()) return;

    for (WebSocketSession session : sessions) {
        if (!session.isOpen()) continue;
        broadcastExecutor.submit(() -> sendToSession(session, message));   // 세션별 비동기 전송
    }
}

private void sendToSession(WebSocketSession session, String message) {
    synchronized (session) {                          // 같은 세션에 대한 쓰기를 직렬화
        try {
            if (!session.isOpen()) return;
            session.sendMessage(new TextMessage(message));
        } catch (IOException e) {
            sessions.remove(session);                 // 응답 없는 세션은 즉시 제거
            try { session.close(CloseStatus.SERVER_ERROR); } catch (IOException ignore) { }
        }
    }
}
```
</details>

**검증**
- 정규장 실사용 중 로그로 확인

| 지표 | 수정 전 | 수정 후 |
|---|---|---|
| 틱 유실 경고 | 간헐적 발생 | 0건  |
| 전송 타임아웃 | 2건 / 10분 (0.2건/분) | 0건 / 17분  |
| 좀비 세션 반복 타임아웃 | 제거되지 않아 매 브로드캐스트마다 재발 가능 | 전송 실패 즉시 세션 제거, 재발 0 |
