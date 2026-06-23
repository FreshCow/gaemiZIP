package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.Board;

import java.util.List;

public interface BoardRepository extends JpaRepository<Board, Long> {
    //최신 작성일 기준으로 내림차순 정렬
    List<Board> findAllByOrderByCreatedAtDesc();

    List<Board> findAllByIsBlindedFalseOrderByCreatedAtDesc();
}
