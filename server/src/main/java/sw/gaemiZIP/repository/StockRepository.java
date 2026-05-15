package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.Stock;

import java.util.List;

public interface StockRepository extends JpaRepository<Stock, String> {
    List<Stock> findTop10ByNameContainingOrInitialContaining(String name, String chosung);
}
