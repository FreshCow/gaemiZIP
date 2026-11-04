package sw.gaemiZIP.entity.board;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import sw.gaemiZIP.entity.member.MemberAnt;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "comment_like", uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "comment_id"}), indexes = @Index(name = "idx_comment_like_comment", columnList = "comment_id"))
public class CommentLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private MemberAnt member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private Comment comment;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getMemberId() { return member != null ? member.getId() : null; }
    public Long getCommentId() { return comment != null ? comment.getId() : null; }
}
