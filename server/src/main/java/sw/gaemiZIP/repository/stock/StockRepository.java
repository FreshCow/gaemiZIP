package sw.gaemiZIP.repository.stock;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sw.gaemiZIP.entity.stock.Stock;

import java.util.List;

public interface StockRepository extends JpaRepository<Stock, String> {

    @Query("""
    SELECT DISTINCT s
        FROM Stock s
        LEFT JOIN StockAlias a ON a.stock = s
        WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR s.initial LIKE CONCAT('%', :keyword, '%')
           OR LOWER(a.alias) LIKE LOWER(CONCAT('%', :keyword, '%'))""")
    List<Stock> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

}
