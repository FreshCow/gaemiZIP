package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.dto.stock.IndexResponse;
import sw.gaemiZIP.service.IndexFetchService;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class IndexController {

    private final IndexFetchService indexFetchService;

    @GetMapping("/index")
    public ResponseEntity<List<IndexResponse>> getIndex() {
        return ResponseEntity.ok(indexFetchService.getCurrentIndices());
    }

}
