package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.board.BoardListResponse;
import sw.gaemiZIP.entity.board.Board;
import sw.gaemiZIP.entity.board.Comment;
import sw.gaemiZIP.repository.board.BoardIdCount;
import sw.gaemiZIP.repository.board.BoardRepository;
import sw.gaemiZIP.repository.board.CommentRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    //관리자 전용 - 전체 게시글 목록(댓글 수 포함) 가져오기
    @Transactional(readOnly = true)
    public List<BoardListResponse> getAllBoards() {
        List<Board> boards = boardRepository.findAllByOrderByCreatedAtDesc();

        Map<Long, Long> commentCounts = commentRepository.countByBoardIdGroup().stream()
                .collect(Collectors.toMap(BoardIdCount::getBoardId, BoardIdCount::getCnt));

        return boards.stream()
                .map(b -> new BoardListResponse(
                        b.getId(),
                        b.getTitle(),
                        b.getAuthor(),
                        b.getLikeCount(),
                        commentCounts.getOrDefault(b.getId(), 0L),
                        b.getCreatedAt(),
                        b.getStockCode(),
                        b.getStockName(),
                        b.isBlinded(),
                        b.getTag()
                ))
                .toList();
    }

    //관리자 전용 - 블라인드 처리된 댓글 가져오기
    @Transactional(readOnly = true)
    public List<Comment> getComments(Long boardId) {
        return commentRepository.findAllByBoard_IdOrderByCreatedAtAsc(boardId);
    }


}
