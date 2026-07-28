package sw.gaemiZIP.entity.board;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private Long boardId;

    @Column(nullable = false)
    private LocalDateTime createdAt =  LocalDateTime.now();

}
