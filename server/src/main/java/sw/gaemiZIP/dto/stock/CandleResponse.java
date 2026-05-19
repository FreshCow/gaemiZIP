package sw.gaemiZIP.dto.stock;

// lightweight-charts가 요구하는 { time, open, high, low, close } 형태로 직렬화
public record CandleResponse(
        long   time,   // Unix epoch seconds (KST 기준)
        double open,
        double high,
        double low,
        double close,
        long   volume
) {}
