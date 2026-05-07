package sw.scalperagent.dto;

import java.util.List;

public record NaverNewsResponse(
        List<NaverNewsItem> items
) {}
