package sw.gaemiZIP.service.kiwoom;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import sw.gaemiZIP.dto.stock.OrderBookLevel;
import sw.gaemiZIP.dto.stock.OrderBookResponse;
import sw.gaemiZIP.service.stock.IndexFetchService;
import sw.gaemiZIP.service.stock.ReservationService;
import sw.gaemiZIP.websocket.StockWebSocketHandler;

import java.io.IOException;
import java.time.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

@Service
@RequiredArgsConstructor
@Slf4j
public class KiwoomRealtimeService {

    private final KiwoomTokenService tokenService;
    private final StockWebSocketHandler frontEndHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private WebSocketSession kiwoomSession;
    private static final long RECONNECT_DELAY_MS = 5_000; //연결 끊기면 5초 후 재시도
    private final ReservationService reservationService;
    private final IndexFetchService indexFetchService;

    //지수 정보
    private static final Map<String, String> IndexList = Map.of("001", "코스피", "101", "코스닥", "201", "코스피200");

    // 구독 중인 종목 코드 (재연결 시 복구용) -> 마지막 접근 시각
    private final Map<String, Instant> lastAccessedAt = new ConcurrentHashMap<>();
    private static final Duration SUBSCRIPTION_TTL = Duration.ofMinutes(5);

    // LOGIN ack를 받기 전에는 REG(구독) 요청을 보낼 수 없음
    private volatile boolean loggedIn = false;

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        Thread thread = new Thread(this::connectLoop, "kiwoom-ws");
        thread.setDaemon(true);
        thread.start();
    }

    private void connectLoop() {
        while (true) {
            connect();
            log.warn("실시간 서버 재연결 대기 ({}ms 후 재시도)", RECONNECT_DELAY_MS);
            try{
                Thread.sleep(RECONNECT_DELAY_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    public void connect() {
        StandardWebSocketClient client = new StandardWebSocketClient();
        String url = "wss://mockapi.kiwoom.com:10000/api/dostk/websocket";
        CountDownLatch closeLatch = new CountDownLatch(1);

        try {
            client.execute(new TextWebSocketHandler() {

                @Override
                public void afterConnectionEstablished(WebSocketSession session) {
                    session.setTextMessageSizeLimit(1024*1024); // 기본 버퍼(8kb)로는 다종목 배치 메시지가 못들와서 확장
                    kiwoomSession = session;
                    loggedIn = false;
                    log.info("키움 실시간 서버 연결 성공");
                    sendLoginMessage();
                }

                @Override
                protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                    String payload = message.getPayload();
                    //log.debug("키움 원본: {}", payload.length() > 200 ? payload.substring(0, 200) : payload);

                    // PING은 받은 그대로 echo해야 연결이 유지됨
                    if (payload.contains("\"trnm\":\"PING\"")) {
                        try {
                            session.sendMessage(new TextMessage(payload));
                            log.debug("PING 응답 전송");
                        } catch (IOException e) {
                            log.warn("PING 응답 실패 : {}", e.getMessage());
                        }
                        return;
                    }

                    // LOGIN ack — 이 시점부터 REG(구독) 요청이 가능
                    if (payload.contains("\"trnm\":\"LOGIN\"")) {
                        loggedIn = true;
                        log.info("키움 실시간 로그인 성공");
                        if (lastAccessedAt.isEmpty()) {
                            lastAccessedAt.put("005930", Instant.now());
                        }
                        sendSubscribeMessage(new ArrayList<>(lastAccessedAt.keySet()));
                        sendIndexSubscribeMessage();
                        return;
                    }

                    // 실시간 데이터
                    if (payload.contains("\"trnm\":\"REAL\"")) {
                        handleRealMessage(payload);
                    }
                }

                @Override
                public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                    log.warn("키움 실시간 서버 연결 종료: {}", status);
                    kiwoomSession = null;
                    loggedIn = false;
                    closeLatch.countDown();
                }
            }, url).get();

            closeLatch.await();

        } catch (Exception e) {
            log.error("키움 WebSocket 연결 실패: {}", e.getMessage());
        }
    }

    // 랭킹 갱신 시 StockFetchService에서 호출 — 신규 종목만 모아서 REG 한 번에 요청 (rate limit 방지)
    public void subscribeAll(List<String> codes) {
        List<String> newCodes = new ArrayList<>();
        Instant now = Instant.now();
        for (String code : codes) {
            if (lastAccessedAt.put(code, now) == null) { //신규 등록 여부와 무관하게 항상
                newCodes.add(code);
            }
        }

        if (!newCodes.isEmpty()) {
            sendSubscribeMessage(newCodes);
        }
    }

    // REAL 메시지: {"trnm":"REAL","data":[{"type":"0B","item":"005930","values":{"10":"-82000", ...}}]}
    private void handleRealMessage(String payload) {
        try {
            //리드트리는 json의 키나 구조가 매번 달라져서 고정된 DTO클래스를 만들기 어려울 때 사용
            JsonNode root = objectMapper.readTree(payload);
            for (JsonNode entry : root.path("data")) {
                String type = entry.path("type").asText();
                String code = entry.path("item").asText();
                JsonNode values = entry.path("values");

                if ("0B".equals(type)) {
                    String cntrTm   = values.path("20").asText("");
                    String rawPrice = values.path("10").asText("0");
                    String rawRate  = values.path("12").asText("0");
                    String rawVolume = values.path("13").asText("0");
                    processTick(code, cntrTm, rawPrice, rawRate, rawVolume);
                } else if ("0D".equals(type)) {
                    processQuote(code, values);
                } else if ("0J".equals(type)) {
                    String rawPrice = values.path("10").asText("0"); // 현재가(지수)
                    String rawRate  = values.path("12").asText("0"); // 등락율
                    processIndex(code, rawPrice, rawRate);
                }
            }
        } catch (Exception e) {
            log.warn("REAL 데이터 파싱 실패: {}", e.getMessage());
        }
    }

    // 코스피/코스닥/코스피200 지수 처리 — FID 10(현재가)·12(등락율)만 사용
    // 지수는 소수점이 있어(예: "1040.05") processTick의 Long 파싱 대신 Double 파싱 사용, 부호는 방향 표시라 Math.abs로 제거
    private void processIndex(String code, String rawPrice, String rawRate) {
        log.info("수정한 키움리얼타임서비스 0J 수신 code={}", code);

        try {
            String price = String.valueOf(Math.abs(Double.parseDouble(rawPrice.replace(",", "").trim())));
            String rate = normalizeRate(rawRate);

            indexFetchService.updateFromRealtime(code, IndexList.get(code), price, rate);
        } catch (Exception e) {
            log.warn("실시간 지수 처리 실패 ({}): {}", code, e.getMessage());
        }
    }

    private void processQuote(String code, JsonNode values) {
        try {
            List<OrderBookLevel> asks = new ArrayList<>();
            List<OrderBookLevel> bids = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                long askPrice = absLong(values.path(String.valueOf(41 + i)).asText("0"));
                long askQty   = absLong(values.path(String.valueOf(61 + i)).asText("0"));
                asks.add(new OrderBookLevel(askPrice, askQty));

                long bidPrice = absLong(values.path(String.valueOf(51 + i)).asText("0"));
                long bidQty   = absLong(values.path(String.valueOf(71 + i)).asText("0"));
                bids.add(new OrderBookLevel(bidPrice, bidQty));
            }
            long totalAskQty = absLong(values.path("121").asText("0"));
            long totalBidQty = absLong(values.path("125").asText("0"));

            OrderBookResponse response = new OrderBookResponse(code, asks, bids, totalAskQty, totalBidQty);
            frontEndHandler.broadcast("QUOTE_UPDATE:" + objectMapper.writeValueAsString(response));
        } catch (Exception e) {
            log.warn("실시간 호가 처리 실패 ({}): {}", code, e.getMessage());
        }
    }

    private long absLong(String raw) {
        if (raw == null || raw.isBlank()) return 0;
        return Math.abs(Long.parseLong(raw.replace(",", "").trim()));
    }

    // 파싱된 필드로 REALTIME_UPDATE + TICK_UPDATE 브로드캐스트, 예약 주문 체결 매칭
    private void processTick(String code, String cntrTm, String rawPrice, String rawRate, String rawVolume) {
        try {
            String price = String.valueOf(Math.abs(Long.parseLong(rawPrice.replace(",", "").trim())));
            String rate = normalizeRate(rawRate);
            long volume = Long.parseLong(rawVolume.replace(",", "").trim());

            Map<String, Object> stockData = new LinkedHashMap<>();
            stockData.put("code",   code);
            stockData.put("price",  price);
            stockData.put("rate",   rate);
            stockData.put("volume", volume);
            //log.info("실시간: code={} price={} rate={} volume={}", code, price, rate, volume);
            frontEndHandler.broadcast("REALTIME_UPDATE:" + objectMapper.writeValueAsString(stockData));
            reservationService.matchAndExecute(code, Long.parseLong(price));

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
            log.warn("실시간 틱 처리 실패 ({}): {}", code, e.getMessage());
        }
    }

    // 키움 등락율(FID 12)은 이미 부호가 붙어서 옴("+1.60"/"-0.50") — 부호 없으면 보합(0)으로 처리
    private String normalizeRate(String rawRate) {
        if (rawRate == null || rawRate.isBlank()) return "0";
        String trimmed = rawRate.trim();
        double value;
        try {
            value = Double.parseDouble(trimmed);
        } catch (NumberFormatException e) {
            return "0";
        }
        if (value == 0) return "0";
        if (trimmed.startsWith("+") || trimmed.startsWith("-")) return trimmed;
        return value > 0 ? "+" + trimmed : trimmed;
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

    private void sendLoginMessage() {
        if (kiwoomSession == null || !kiwoomSession.isOpen()) return;
        try {
            String accessToken = tokenService.getAccessToken();
            if (accessToken == null || accessToken.isBlank()) {
                log.error("액세스 토큰이 없습니다 — 로그인 중단");
                return;
            }
            String loginJson = String.format("""
                {"trnm":"LOGIN","token":"%s"}""", accessToken);
            kiwoomSession.sendMessage(new TextMessage(loginJson));
            log.info("키움 실시간 로그인 요청 전송");
        } catch (IOException e) {
            log.error("로그인 메시지 전송 실패: {}", e.getMessage());
        }
    }

    private void sendIndexSubscribeMessage() {
        try {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("item", List.of("001", "101", "201"));
            entry.put("type", List.of("0J"));

            Map<String, Object> reg = new LinkedHashMap<>();
            reg.put("trnm", "REG");
            reg.put("grp_no", "2"); // 종목 그룹("1")과 분리 — 해제 로직에 안 걸리게
            reg.put("refresh", "1");
            reg.put("data", List.of(entry));

            kiwoomSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(reg)));
        }catch (IOException e) {
            log.error("구독 메시지 전송 실패: {}", e.getMessage());
        } catch (Exception e) {
            log.error("실시간 구독 요청 중 오류: {}", e.getMessage());
        }
    }

    // 종목코드 여러 개를 한 번에 담아서 전송
    private void sendSubscribeMessage(List<String> codes) {
        if (codes.isEmpty()) return;
        if (kiwoomSession == null || !kiwoomSession.isOpen() || !loggedIn) {
            log.debug("로그인 대기 중 — {}개 종목 구독 대기 {}", codes.size(), codes);
            return;
        }
        try {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("item", codes);
            entry.put("type", List.of("0B", "0D"));

            Map<String, Object> reg = new LinkedHashMap<>();
            reg.put("trnm", "REG");
            reg.put("grp_no", "1");
            reg.put("refresh", "1");
            reg.put("data", List.of(entry));

            kiwoomSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(reg)));
            log.info("실시간 구독 요청: {}개 종목", codes.size());
        } catch (IOException e) {
            log.error("구독 메시지 전송 실패: {}", e.getMessage());
        } catch (Exception e) {
            log.error("실시간 구독 요청 중 오류: {}", e.getMessage());
        }
    }

    private void sendUnsubscribeMessage(List<String> codes) {
        if (codes.isEmpty()) return;
        if (kiwoomSession == null || !kiwoomSession.isOpen() || !loggedIn) {
            log.debug("로그인 안 됨 — 구독 해제 스킵 {}", codes);
            return;
        }
        try {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("item", codes);
            entry.put("type", List.of("0B", "0D"));

            Map<String, Object> remove = new LinkedHashMap<>();
            remove.put("trnm", "REMOVE");
            remove.put("grp_no", "1");
            remove.put("data", List.of(entry));

            kiwoomSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(remove)));
            log.info("실시간 구독 해제 요청: {}개 종목 {}", codes.size(), codes);
        } catch (IOException e) {
            log.error("구독 해제 메시지 전송 실패: {}", e.getMessage());
        } catch (Exception e) {
            log.error("실시간 구독 해제 요청 중 오류: {}", e.getMessage());
        }
    }

    //1분마다 5분 이상 미접근 종목 구독 해제
    @Scheduled(fixedRate = 60_000, initialDelay = 60_000)
    public void cleanupStaleSubscriptions() {
        Instant threshold = Instant.now().minus(SUBSCRIPTION_TTL);
        List<String> stale = lastAccessedAt.entrySet().stream()
                .filter(e -> e.getValue().isBefore(threshold))
                .map(Map.Entry::getKey)
                .toList();

        if (stale.isEmpty()) return;

        stale.forEach(lastAccessedAt :: remove);
        sendUnsubscribeMessage(stale);
        log.info("미접근 종목 구독 해제 : {}개 {}", stale.size(), stale);
    }
}
