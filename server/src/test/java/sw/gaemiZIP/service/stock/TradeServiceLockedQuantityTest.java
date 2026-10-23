package sw.gaemiZIP.service.stock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import sw.gaemiZIP.dto.stock.TradeRequest;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.Holding;
import sw.gaemiZIP.entity.stock.TradeHistory;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.StockRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.util.MarketHoursUtil;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TradeServiceLockedQuantityTest {

    @Mock
    MemberAntRepository  memberAntRepository;
    @Mock
    TradeHistoryRepository tradeHistoryRepository;
    @Mock
    HoldingRepository holdingRepository;
    @Mock
    StockRepository stockRepository;
    @InjectMocks
    TradeService tradeService;


    //테스트용 사용자 만들기
    private MemberAnt newMember(long balance){
        MemberAnt member = MemberAnt.builder().username("tester").balance(balance).build();
        ReflectionTestUtils.setField(member, "id", 1L);
        ReflectionTestUtils.setField(member, "lockedBalance", 0L); //null이므로 초기화
        given(memberAntRepository.findByLoginIdForUpdate("tester")).willReturn(Optional.of(member));
        given(tradeHistoryRepository.save(any(TradeHistory.class))).willAnswer(i -> i.getArgument(0));

        return member;
    }

    private TradeRequest request(String type, int price, int qty) {
        TradeRequest r = new TradeRequest();
        r.setStockCode("005930");
        r.setStockName("삼성전자");
        r.setTradeType(type);
        r.setPrice(price);
        r.setQuantity(qty);
        return r;
    }

    @Test
    @DisplayName("예약 매도로 잠긴 수량은 즉시 매도할 수 없어야 한다")
    void sell_lockedQuantity_isRejected() {

        MemberAnt member = newMember(100_000_000L);
        Holding holding = Holding.builder().member(member).stockName("삼성전자").quantity(30).avgPrice(200_000L).build();
        holding.lock(25); // 예약매도 10주 + 15주

        given(holdingRepository.findByMember_IdAndStock_Code(1L, "005930")).willReturn(Optional.of(holding));

        try (MockedStatic<MarketHoursUtil> mh = mockStatic(MarketHoursUtil.class)) {
            mh.when(MarketHoursUtil::isMarketHours).thenReturn(true);

            //수량은 30 - 25 = 5주인데 20주 매도 요청
            assertThatThrownBy(() -> tradeService
                    .executeSell("tester", request("SELL", 200_000, 20)))
                    .isInstanceOf(IllegalStateException.class);
        }

        assertThat(holding.getQuantity()).isEqualTo(30);
        assertThat(member.getBalance()).isEqualTo(100_000_000L);

    }

    @Test
    @DisplayName("예약 매수로 잠긴 잔고는 즉시 매수에 쓸 수 없어야 한다")
    void buy_lockedBalance_isRejected() {
        MemberAnt member = newMember(1_000_000L);
        member.lockBalance(800_000L); // 예약 매수로 잠긴 금액 → 가용 잔고 200,000
        given(holdingRepository.findByMember_IdAndStock_Code(1L, "005930")).willReturn(Optional.empty());

        try (MockedStatic<MarketHoursUtil> mh = mockStatic(MarketHoursUtil.class)) {
            mh.when(MarketHoursUtil::isMarketHours).thenReturn(true);

            // 500,000원 매수 요청 (전체 잔고 100만원 이내이지만 가용 잔고 초과)
            assertThatThrownBy(() -> tradeService.executeBuy("tester", request("BUY", 500_000, 1)))
                    .isInstanceOf(IllegalStateException.class);
        }
        assertThat(member.getBalance()).isEqualTo(1_000_000L);
    }

}