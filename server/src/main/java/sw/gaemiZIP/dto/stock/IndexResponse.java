package sw.gaemiZIP.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IndexResponse {
    private String code; //001(코스피), 101(코스닥), 201(코스피200)
    private String name; //코스피, 코스닥, 코스피200
    private String price; //현재가
    private String rate; //등락률
}
