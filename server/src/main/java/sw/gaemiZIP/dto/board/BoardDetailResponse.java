package sw.gaemiZIP.dto.board;

import sw.gaemiZIP.entity.board.Board;

import java.time.LocalDateTime;

public record BoardDetailResponse(Long id, String title, String content, String author,
                                  int likeCount, LocalDateTime createdAt, String stockCode, String stockName, boolean blinded) {

    public static BoardDetailResponse from(Board b) {
        return new BoardDetailResponse(b.getId(), b.getTitle(), b.getContent(), b.getAuthor(),
                b.getLikeCount(), b.getCreatedAt(), b.getStockCode(), b.getStockName(), b.isBlinded());
    }

}
