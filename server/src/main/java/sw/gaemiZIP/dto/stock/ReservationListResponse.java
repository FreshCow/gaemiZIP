package sw.gaemiZIP.dto.stock;

import lombok.Getter;

import java.util.List;

@Getter
public class ReservationListResponse {
    //프론트가 폴링만으로 잔고를 갱신하는 핵심 응답

    private final List<ReservationResponse> reservations;
    private final Long balance;
    private final Long lockedBalance;

    public ReservationListResponse(List<ReservationResponse> reservations, Long balance, Long lockedBalance) {
        this.reservations = reservations;
        this.balance = balance;
        this.lockedBalance = lockedBalance;
    }

}
