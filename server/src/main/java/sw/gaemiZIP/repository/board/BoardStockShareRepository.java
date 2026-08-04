package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.board.BoardStockShare;

import java.util.List;

public interface BoardStockShareRepository extends JpaRepository<BoardStockShare, Long> {
    List<BoardStockShare> findAllByBoardId(Long boardId);
}
