package sw.scalperagent.dto;

public record NaverNewsItem(
        String title,
        String link,
        String originallink,
        String description,
        String pubDate
) {}
