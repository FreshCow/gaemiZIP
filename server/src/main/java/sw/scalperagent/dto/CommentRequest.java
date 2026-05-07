package sw.scalperagent.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommentRequest {

    private String author;
    private String content;
    private Long parentCommentId; // null이면 일반 댓글, 값이 있으면 대댓글
}
