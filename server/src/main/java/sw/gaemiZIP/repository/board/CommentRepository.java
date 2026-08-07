package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import sw.gaemiZIP.entity.board.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByBoardIdOrderByCreatedAtAsc(Long boardId);

    //블라인드 댓글 제외
    List<Comment> findAllByBoardIdAndIsBlindedFalseOrderByCreatedAtAsc(Long boardId);

    @Query("select c.boardId as boardId, count(c) as cnt from Comment c group by c.boardId")
    List<BoardIdCount> countByBoardIdGroup();
}
