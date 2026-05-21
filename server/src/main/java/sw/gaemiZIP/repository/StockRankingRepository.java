package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.StockRanking;

import java.util.List;

public interface StockRankingRepository extends JpaRepository<StockRanking, Long> {
    // 서버 재시작 시 캐시 복원용
    List<StockRanking> findTop10ByOrderByCreatedAtDesc();

    // 특정 종목의 가장 최근 가격 1건
    java.util.Optional<StockRanking> findTopByCodeOrderByCreatedAtDesc(String code);
}