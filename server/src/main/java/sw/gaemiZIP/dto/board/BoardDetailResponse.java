package sw.gaemiZIP.dto.board;

import sw.gaemiZIP.entity.board.Board;
import sw.gaemiZIP.entity.board.BoardStockShare;
import sw.gaemiZIP.entity.board.BoardTag;

import java.time.LocalDateTime;
import java.util.List;

public record BoardDetailResponse(Long id, String title, String content, String author,
                                  int likeCount, LocalDateTime createdAt, String stockCode, String stockName, boolean blinded,
                                  BoardTag tag, List<BoardStockShareResponse> sharedStocks) {

    public static BoardDetailResponse from(Board b, List<BoardStockShare> shares) {
        return new BoardDetailResponse(b.getId(), b.getTitle(), b.getContent(), b.getAuthor(),
                b.getLikeCount(), b.getCreatedAt(), b.getStockCode(), b.getStockName(), b.isBlinded(), b.getTag(),
                shares.stream().map(BoardStockShareResponse::from).toList());
    }

}
