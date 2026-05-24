package sw.gaemiZIP.dto.kiwoom;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 키움 ka10099 (전종목 리스트 조회) 응답 바디 DTO
 */
@Getter
@Setter
public class KiwoomStockListResponse {

    private List<KiwoomStockItem> list;
}
