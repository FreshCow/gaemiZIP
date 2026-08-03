package sw.gaemiZIP.dto.board;

import sw.gaemiZIP.entity.board.BoardTag;

import java.time.LocalDateTime;

public record BoardListResponse
    (Long id,
     String title,
     String author,
     int likeCount,
     long commentCount,
     LocalDateTime createdAt,
     String stockCode,
     String stockName,
     boolean blinded,
     BoardTag tag){}

