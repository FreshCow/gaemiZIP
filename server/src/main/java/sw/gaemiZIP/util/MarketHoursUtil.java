package sw.gaemiZIP.util;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public class MarketHoursUtil {

    public static boolean isMarketHours(){
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        LocalTime t = now.toLocalTime();

        return !t.isBefore(LocalTime.of(9, 0)) && !t.isAfter(LocalTime.of(15, 30));
    }

}
