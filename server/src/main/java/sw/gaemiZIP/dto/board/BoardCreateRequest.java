package sw.gaemiZIP.dto.board;

import sw.gaemiZIP.entity.board.BoardTag;

import java.util.List;

public record BoardCreateRequest(String title, String content, BoardTag tag,
                                List<BoardStockShareRequest> sharedStocks) {
}
