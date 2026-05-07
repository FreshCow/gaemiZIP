package sw.scalperagent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.scalperagent.entity.StockRanking;

import java.util.List;

public interface StockRankingRepository extends JpaRepository<StockRanking, Long> {
    // 서버 재시작 시 캐시 복원용: 가장 최근에 저장된 10개 조회
    List<StockRanking> findTop10ByOrderByCreatedAtDesc();
}