package sw.gaemiZIP.dto.news;

public record NaverNewsItem(
        String title,
        String link,
        String originallink,
        String description,
        String pubDate
) {}
