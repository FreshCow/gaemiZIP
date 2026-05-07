package sw.gaemiZIP.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;

// 연결된 모든 웹 클라이언트 세션을 관리하고 메시지를 브로드캐스트하는 핸들러
@Slf4j
@Component
public class StockWebSocketHandler extends TextWebSocketHandler {

    // CopyOnWriteArrayList: 멀티스레드 환경에서 읽기/쓰기 동시 접근 안전
    private static final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

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
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                log.error("WebSocket 전송 실패 (session={}): {}", session.getId(), e.getMessage());
            }
        }
    }
}
