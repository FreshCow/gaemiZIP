package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.StockAlias;

import java.util.List;

public interface StockAliasRepository extends JpaRepository<StockAlias, Long> {

    //특정 종목에 등록된 별칭 목록 조회용
    List<StockAlias> findAllByStock_Code(String stockCode);

    //별칭 저장전에 중복 체크용
    boolean existsByStock_CodeAndAlias(String stockCode, String alias);

    //특정 종목의 특정 별칭 하나만 삭제
    void deleteByStock_CodeAndAlias(String stockCode, String alias);
}
