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
@Table(name = "board_like", uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "board_id"}))
public class BoardLike {

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
    @JoinColumn(name = "board_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private Board board;

    @Column(nullable = false)
    private LocalDateTime createdAt =  LocalDateTime.now();

    public Long getMemberId() { return member != null ? member.getId() : null; }
    public Long getBoardId() { return board != null ? board.getId() : null; }
}
