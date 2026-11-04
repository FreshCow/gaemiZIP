package sw.gaemiZIP.dto.board;

import java.util.List;

// 게시글 목록 페이지 응답 (page는 0-based, 공지는 totalElements에 포함되지 않음)
public record BoardListPageResponse(
        List<BoardListResponse> items,
        int page,
        int size,
        int totalPages,
        long totalElements) {}
