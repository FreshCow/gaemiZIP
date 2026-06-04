package sw.gaemiZIP.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import sw.gaemiZIP.websocket.StockWebSocketHandler;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class KiwoomRealtimeService {

    private final KiwoomTokenService tokenService;
    private final StockWebSocketHandler frontEndHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private WebSocketSession kiwoomSession;

    // 구독 중인 종목 코드 (재연결 시 복구용)
    private final Set<String> subscribedCodes = ConcurrentHashMap.newKeySet();

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        Thread thread = new Thread(this::connect, "kiwoom-ws");
        thread.setDaemon(true);
        thread.start();
    }

    public void connect() {
        StandardWebSocketClient client = new StandardWebSocketClient();
        String url = "wss://mockapi.kiwoom.com:10000/api/dostk/websocket";

        try {
            client.execute(new TextWebSocketHandler() {
                @Override
                public void afterConnectionEstablished(WebSocketSession session) {
                    kiwoomSession = session;
                    log.info("키움 실시간 서버 연결 성공");
                    // 기존 구독 코드 복구 (재연결) — 없으면 기본 종목 구독
                    if (subscribedCodes.isEmpty()) {
                        sendSubscribeMessage("005930");
                        subscribedCodes.add("005930");
                    } else {
                        subscribedCodes.forEach(KiwoomRealtimeService.this::sendSubscribeMessage);
                    }
                }

                @Override
                protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                    String payload = message.getPayload();
                    log.debug("키움 원본: {}", payload.length() > 200 ? payload.substring(0, 200) : payload);
                    parseAndBroadcast(payload);
                }

                @Override
                public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                    log.warn("키움 실시간 서버 연결 종료: {}", status);
                    kiwoomSession = null;
                }
            }, url).get();
        } catch (Exception e) {
            log.error("키움 WebSocket 연결 실패: {}", e.getMessage());
        }
    }

    // 랭킹 갱신 시 StockFetchService에서 호출 — 신규 종목만 구독 추가
    public void subscribeAll(List<String> codes) {
        for (String code : codes) {
            if (subscribedCodes.add(code)) {
                sendSubscribeMessage(code);
            }
        }
    }

    // H0STCNT0 파이프 구분 실시간 데이터 → REALTIME_UPDATE + TICK_UPDATE 브로드캐스트
    // 형식: "0|H0STCNT0|001|종목코드^체결시간^현재가^전일대비부호^전일대비^전일대비율^...^누적거래량^..."
    private void parseAndBroadcast(String payload) {
        if (payload == null || payload.isBlank() || "PINGPONG".equals(payload.trim())) return;
        if (payload.startsWith("{")) return;

        String[] parts = payload.split("\\|", 4);
        if (parts.length < 4 || !"H0STCNT0".equals(parts[1])) return;

        String[] fields = parts[3].split("\\^");
        if (fields.length < 14) {
            log.warn("H0STCNT0 필드 수 부족: {}개", fields.length);
            return;
        }

        try {
            String code    = fields[0].trim();
            String cntrTm  = fields[1].trim(); // HHmmss
            String rawPrice = fields[2].trim();
            String sign    = fields[3].trim(); // 1:상한 2:상승 3:보합 4:하한 5:하락
            String rawRate = fields[5].trim();
            long   volume  = Long.parseLong(fields[13].replace(",", "").trim());

            String price = String.valueOf(Math.abs(Long.parseLong(rawPrice.replace(",", ""))));

            String rate = switch (sign) {
                case "1", "2" -> "+" + rawRate;
                case "4", "5" -> "-" + rawRate;
                default        -> "0";
            };

            // REALTIME_UPDATE: name 제외 (프론트에서 기존 name 유지)
            Map<String, Object> stockData = new LinkedHashMap<>();
            stockData.put("code",   code);
            stockData.put("price",  price);
            stockData.put("rate",   rate);
            stockData.put("volume", volume);
            log.info("실시간: code={} price={} rate={} volume={}", code, price, rate, volume);
            frontEndHandler.broadcast("REALTIME_UPDATE:" + objectMapper.writeValueAsString(stockData));

            // TICK_UPDATE: 차트 실시간 캔들 업데이트용
            // time     = 분 경계 epoch (캔들 집계용)
            // tickTime = 초 단위 epoch (틱 라인용)
            long minuteEpoch = parseMinuteBoundary(cntrTm);
            long secondEpoch = parseSecondEpoch(cntrTm);
            if (minuteEpoch > 0) {
                Map<String, Object> tickData = new LinkedHashMap<>();
                tickData.put("code",     code);
                tickData.put("time",     minuteEpoch);
                tickData.put("tickTime", secondEpoch);
                tickData.put("price",    Long.parseLong(price));
                frontEndHandler.broadcast("TICK_UPDATE:" + objectMapper.writeValueAsString(tickData));
            }
        } catch (Exception e) {
            log.warn("H0STCNT0 파싱 실패: {}", e.getMessage());
        }
    }

    // "093547" (HHmmss) → 오늘 KST 해당 분의 epoch seconds (캔들 집계용, 초 버림)
    private long parseMinuteBoundary(String cntrTm) {
        if (cntrTm == null || cntrTm.length() < 4) return 0;
        try {
            int hh = Integer.parseInt(cntrTm.substring(0, 2));
            int mm = Integer.parseInt(cntrTm.substring(2, 4));
            LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
            return LocalDateTime.of(today, LocalTime.of(hh, mm, 0))
                    .toEpochSecond(ZoneOffset.UTC);
        } catch (Exception e) {
            return 0;
        }
    }

    // "093547" (HHmmss) → 초 단위 epoch seconds (틱 라인용)
    private long parseSecondEpoch(String cntrTm) {
        if (cntrTm == null || cntrTm.length() < 6) return parseMinuteBoundary(cntrTm);
        try {
            int hh = Integer.parseInt(cntrTm.substring(0, 2));
            int mm = Integer.parseInt(cntrTm.substring(2, 4));
            int ss = Integer.parseInt(cntrTm.substring(4, 6));
            LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
            return LocalDateTime.of(today, LocalTime.of(hh, mm, ss))
                    .toEpochSecond(ZoneOffset.UTC);
        } catch (Exception e) {
            return parseMinuteBoundary(cntrTm);
        }
    }

    private void sendSubscribeMessage(String code) {
        if (kiwoomSession == null || !kiwoomSession.isOpen()) {
            log.debug("WS 미연결 상태 — {} 구독 대기", code);
            return;
        }
        try {
            String accessToken = tokenService.getAccessToken();
            if (accessToken == null || accessToken.isBlank()) {
                log.error("액세스 토큰이 없습니다 — {} 구독 중단", code);
                return;
            }

            String subscribeJson = String.format("""
                {
                    "header": {
                        "authorization": "Bearer %s",
                        "custtype": "P",
                        "tr_type": "1",
                        "content-type": "utf-8"
                    },
                    "body": {
                        "input": {
                            "tr_id": "01",
                            "tr_key": "%s"
                        }
                    }
                }
                """, accessToken, code);

            kiwoomSession.sendMessage(new TextMessage(subscribeJson));
            log.info("실시간 구독 요청: {}", code);
        } catch (IOException e) {
            log.error("구독 메시지 전송 실패 ({}): {}", code, e.getMessage());
        } catch (Exception e) {
            log.error("실시간 구독 요청 중 오류 ({}): {}", code, e.getMessage());
        }
    }
}
