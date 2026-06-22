package sw.gaemiZIP.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "board")
@Getter
@Setter
public class Board {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String author; // 작성자 (키움증권 계정)

    @Column(nullable = false)
    private String title; //글 제목

    @Column(nullable = false)
    private String content; //글 내용

    @Column(nullable = true)
    private String stockCode;

    @Column(nullable = true)
    private String stockName;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = true)
    private String password;

    @Column(nullable = false)
    private int likeCount = 0;

    @Column(nullable = false)
    private boolean isBlinded = false;

    public void blind() {this.isBlinded = true;}
    public void unblind() {this.isBlinded = false;}
}
