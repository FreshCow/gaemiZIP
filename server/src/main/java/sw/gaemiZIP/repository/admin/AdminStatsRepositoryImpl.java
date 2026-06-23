package sw.gaemiZIP.repository.admin;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import sw.gaemiZIP.dto.admin.SignupTrendResponse;
import sw.gaemiZIP.dto.admin.TradeVolumeResponse;
import sw.gaemiZIP.entity.TradeHistory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static sw.gaemiZIP.entity.QMemberAnt.memberAnt;
import static sw.gaemiZIP.entity.QTradeHistory.tradeHistory;

@Repository
@RequiredArgsConstructor
public class AdminStatsRepositoryImpl implements AdminStatsRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<SignupTrendResponse> findSignupTrend(int days) {
        List<LocalDateTime> createdDates = queryFactory
                .select(memberAnt.createdDate)
                .from(memberAnt)
                .where(memberAnt.createdDate.goe(LocalDateTime.now().minusDays(days)))
                .fetch();

        Map<LocalDate, Long> grouped = createdDates.stream()
                .collect(Collectors.groupingBy(LocalDateTime::toLocalDate, Collectors.counting()));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e-> new SignupTrendResponse(e.getKey(), e.getValue()))
                .toList();
    }


    @Override
    public List<TradeVolumeResponse> findTradeVolume(int days) {

        List<TradeHistory> trades = queryFactory
                .selectFrom(tradeHistory)
                .where(tradeHistory.tradeTime.goe(LocalDateTime.now().minusDays(days)))
                .fetch();

        Map<LocalDate, List<TradeHistory>> grouped = trades.stream()
                .collect(Collectors.groupingBy(t->t.getTradeTime().toLocalDate()));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e-> new TradeVolumeResponse(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream().mapToLong(t->(long) t.getPrice() * t.getQuantity()).sum()
                )).toList();
    }
}
