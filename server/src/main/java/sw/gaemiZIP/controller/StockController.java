package sw.gaemiZIP.controller;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.entity.Stock;
import sw.gaemiZIP.repository.StockRepository;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockRepository stockRepository;

    @GetMapping("/search")
    public ResponseEntity<List<Stock>> search(@RequestParam String keyword) {

        if(keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Stock> searchResults = stockRepository.findTop10ByNameContainingOrInitialContaining(keyword, keyword);

        return ResponseEntity.ok(searchResults);
    }
}
