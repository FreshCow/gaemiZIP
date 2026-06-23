package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.entity.Board;
import sw.gaemiZIP.entity.Comment;
import sw.gaemiZIP.repository.BoardRepository;
import sw.gaemiZIP.repository.CommentRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminContentService {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;

    //댓글 차단 설정
    @Transactional
    public void blindComment(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalStateException("댓글을 찾을 수 없습니다."));

        if (!comment.isBlinded()) {
            comment.blind();
        }else{
            comment.unblind();
        }
    }

    //게시글 차단 설정
    @Transactional
    public void blindBoard(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new IllegalStateException("게시글을 찾을 수 없습니다."));

        if (!board.isBlinded()) {
            board.blind();
        }else{
            board.unblind();
        }
    }

    //관리자 전용 - 블라인드 처리된 게시글 가져오기
    @Transactional(readOnly = true)
    public List<Board> getAllBoards() {
        return boardRepository.findAllByOrderByCreatedAtDesc();
    }

    //관리자 전용 - 블라인드 처리된 댓글 가져오기
    @Transactional(readOnly = true)
    public List<Comment> getComments(Long boardId) {
        return commentRepository.findAllByBoardIdOrderByCreatedAtAsc(boardId);
    }


}
