package sw.gaemiZIP.entity.stock;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.checkerframework.checker.units.qual.A;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stock {

    @Id
    private String code;    // 종목코드 (6자리)
    private String name;    // 종목명
    private String initial; // 초성 (한글 검색용)
    private String market;  // KOSPI / KOSDAQ
}
