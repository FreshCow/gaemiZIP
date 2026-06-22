package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.entity.Board;
import sw.gaemiZIP.entity.Comment;
import sw.gaemiZIP.repository.BoardRepository;
import sw.gaemiZIP.repository.CommentRepository;

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


}
