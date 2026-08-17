package sw.gaemiZIP.entity.board;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.Stock;

import java.time.LocalDateTime;

@Entity
@Table(name = "board")
@Getter
@Setter
public class Board {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JsonIgnore
    private MemberAnt member; //작성자 계정

    @Column(nullable = false)
    private String author; // 작성자 닉네임

    @Column(nullable = false)
    private String title; //글 제목

    @Column(nullable = false)
    private String content; //글 내용

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_code")
    @JsonIgnore
    private Stock stock;

    @Column(nullable = true)
    private String stockName;

    public Long getMemberId() { return member != null ? member.getId() : null; }
    public String getStockCode() { return stock != null ? stock.getCode() : null; }

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private int likeCount = 0;

    @Column(nullable = false)
    private boolean isBlinded = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardTag tag = BoardTag.DAILY;

    public void blind() {this.isBlinded = true;}
    public void unblind() {this.isBlinded = false;}
}
