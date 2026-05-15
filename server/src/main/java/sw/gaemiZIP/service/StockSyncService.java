package sw.gaemiZIP.service;


import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.entity.Stock;
import sw.gaemiZIP.repository.StockRepository;
import sw.gaemiZIP.util.InitialUtil;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockSyncService {

    private final StockRepository stockRepository;

    @PostConstruct
    @Transactional
    public void initStockData() {
        if (stockRepository.count() > 0) return;

        List<Stock> dummyStocks = List.of(
                createStock("005930", "삼성전자"),
                createStock("000660", "SK하이닉스"),
                createStock("035420", "NAVER"),
                createStock("035720", "카카오"),
                createStock("005380", "현대차"),
                createStock("207940", "삼성바이오로직스")

        );

        stockRepository.saveAll(dummyStocks);
    }

    private Stock createStock(String code, String name) {
        return Stock.builder()
                .code(code)
                .name(name)
                .initial(InitialUtil.getInitial(name))
                .build();
    }
}
