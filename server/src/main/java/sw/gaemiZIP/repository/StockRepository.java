package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.Stock;

import java.util.List;

public interface StockRepository extends JpaRepository<Stock, String> {
    // 종목명 또는 초성으로 최대 10건 검색
    List<Stock> findTop10ByNameContainingOrInitialContaining(String name, String initial);
}
