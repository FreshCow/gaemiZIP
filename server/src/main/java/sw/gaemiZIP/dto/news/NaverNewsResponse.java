package sw.gaemiZIP.dto.news;

import java.util.List;

public record NaverNewsResponse(
        List<NaverNewsItem> items
) {}
