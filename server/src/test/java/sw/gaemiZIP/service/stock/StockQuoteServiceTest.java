package sw.gaemiZIP.service.stock;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import sw.gaemiZIP.dto.kiwoom.KiwoomQuoteResponse;
import sw.gaemiZIP.dto.stock.OrderBookResponse;

import static org.assertj.core.api.Assertions.assertThat;

class StockQuoteServiceTest {

    private final StockQuoteService service = new StockQuoteService(null, null);

    @Test
    @DisplayName("Ka10004 응답을 매도/매수 1~10호가 순서대로 매핑")
    void toOrderBookResponse_mapsLevelsInOrder() {
        KiwoomQuoteResponse r = new KiwoomQuoteResponse();
        r.setSelFprBid("-71200"); r.setSelFprReq("100");   // 매도 1호가
        r.setSel2thPreBid("-71300"); r.setSel2thPreReq("200"); // 매도 2호가
        r.setBuyFprBid("-71100"); r.setBuyFprReq("300");   // 매수 1호가
        r.setBuy2thPreBid("-71000"); r.setBuy2thPreReq("400"); // 매수 2호가
        r.setTotSelReq("1000"); r.setTotBuyReq("2000");
        // 3~10호가는 미설정 → null이면 NumberFormatException 나므로 실제 응답 흉내내려면 "0"으로 채워야 함
        // (테스트 헬퍼로 나머지 필드를 "0"으로 채우는 빌더를 만들어 쓰는 걸 추천)

        OrderBookResponse result = service.toOrderBookResponse("005930", r);

        assertThat(result.getAsks().get(0).getPrice()).isEqualTo(71200);   // 1호가
        assertThat(result.getAsks().get(0).getQuantity()).isEqualTo(100);
        assertThat(result.getAsks().get(1).getPrice()).isEqualTo(71300);   // 2호가
        assertThat(result.getBids().get(0).getPrice()).isEqualTo(71100);
        assertThat(result.getTotalAskQty()).isEqualTo(1000);
        assertThat(result.getTotalBidQty()).isEqualTo(2000);
    }

}