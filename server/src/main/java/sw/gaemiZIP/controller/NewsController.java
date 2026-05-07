package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.entity.News;
import sw.gaemiZIP.service.NewsService;

import java.util.List;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private  final NewsService newsService;

    @GetMapping("/latest")
    public List<News> getLatestNews() {
        return newsService.getLatestNews();
    }
}
