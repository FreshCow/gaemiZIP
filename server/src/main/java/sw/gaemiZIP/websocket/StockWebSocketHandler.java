package sw.gaemiZIP.websocket;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

// 연결된 모든 웹 클라이언트 세션을 관리하고 메시지를 브로드캐스트하는 핸들러
@Slf4j
@Component
public class StockWebSocketHandler extends TextWebSocketHandler {

    // CopyOnWriteArrayList: 멀티스레드 환경에서 읽기/쓰기 동시 접근 안전
    private static final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

    // 세션별 전송을 병렬로 분리 — 느리거나 죽은 세션 하나의 쓰기 지연/타임아웃이
    // 다른 세션으로의 전송(및 이 메서드를 호출하는 키움 I/O 스레드)을 막지 않도록 함
    private final ExecutorService broadcastExecutor = Executors.newCachedThreadPool();

    // 새 클라이언트가 연결됐을 때 즉시 전송할 마지막 브로드캐스트 메시지
    private volatile String lastBroadcastMessage = null;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("웹 클라이언트 연결: {} (총 {}명)", session.getId(), sessions.size());
        if (lastBroadcastMessage != null) {
            try {
                session.sendMessage(new TextMessage(lastBroadcastMessage));
            } catch (IOException e) {
                log.error("초기 데이터 전송 실패 (session={}): {}", session.getId(), e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("웹 클라이언트 해제: {} (총 {}명)", session.getId(), sessions.size());
    }

    // 연결된 모든 웹 클라이언트에 메시지 브로드캐스트
    public void broadcast(String message) {
        this.lastBroadcastMessage = message;
        if (sessions.isEmpty()) return;

        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) continue;
            broadcastExecutor.submit(() -> sendToSession(session, message));
        }
    }

    private void sendToSession(WebSocketSession session, String message) {
        // 키움 WS의 여러 I/O 스레드가 동시에 같은 세션에 sendMessage를 호출하면
        // "TEXT_PARTIAL_WRITING" 상태 예외가 발생 — 세션 단위로 전송을 직렬화
        synchronized (session) {
            try {
                if (!session.isOpen()) return;
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                // 클라이언트가 응답 없이 죽어있는 경우(Write timeout 등) — 목록에서 제거해
                // 매 브로드캐스트마다 같은 세션에서 반복 타임아웃이 발생하지 않도록 함
                log.error("WebSocket 전송 실패, 세션 제거 (session={}): {}", session.getId(), e.getMessage());
                sessions.remove(session);
                try {
                    session.close(CloseStatus.SERVER_ERROR);
                } catch (IOException closeEx) {
                    log.debug("실패한 세션 종료 중 오류 (session={}): {}", session.getId(), closeEx.getMessage());
                }
            }
        }
    }

    @PreDestroy
    public void shutdown() {
        broadcastExecutor.shutdown();
        try {
            if (!broadcastExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                broadcastExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            broadcastExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
