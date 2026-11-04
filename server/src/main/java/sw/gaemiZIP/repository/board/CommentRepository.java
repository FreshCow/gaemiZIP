package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sw.gaemiZIP.entity.board.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByBoard_IdOrderByCreatedAtAsc(Long boardId);

    //블라인드 댓글 제외
    List<Comment> findAllByBoard_IdAndIsBlindedFalseOrderByCreatedAtAsc(Long boardId);

    @Query("select c.board.id as boardId, count(c) as cnt from Comment c group by c.board.id")
    List<BoardIdCount> countByBoardIdGroup();

    //목록에 나온 게시글의 댓글수만 집계
    @Query("select c.board.id as boardId, count(c) as cnt from Comment c where c.board.id in :ids group by c.board.id")
    List<BoardIdCount> countByBoardIdIn(@Param("ids") List<Long> ids);
}
