package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByBoardIdOrderByCreatedAtAsc(Long boardId);
}
