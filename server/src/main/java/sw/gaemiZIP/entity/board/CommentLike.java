package sw.gaemiZIP.entity.board;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "comment_like", uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "comment_id"}))
public class CommentLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private Long commentId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
