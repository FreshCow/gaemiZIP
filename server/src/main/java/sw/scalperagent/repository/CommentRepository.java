package sw.scalperagent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.scalperagent.entity.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByBoardIdOrderByCreatedAtAsc(Long boardId);
}
