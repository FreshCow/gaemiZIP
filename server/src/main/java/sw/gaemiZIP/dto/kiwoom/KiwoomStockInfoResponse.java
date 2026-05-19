package sw.gaemiZIP.dto.kiwoom;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class KiwoomStockInfoResponse {

    //api에서 받은 리스트
    private List<KiwoomStockItem> list;
}
