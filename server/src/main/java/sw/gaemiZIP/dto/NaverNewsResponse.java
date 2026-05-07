package sw.gaemiZIP.dto;

import java.util.List;

public record NaverNewsResponse(
        List<NaverNewsItem> items
) {}
