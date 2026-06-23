package sw.gaemiZIP.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class SignupTrendResponse {
    private LocalDate date;
    private long count;
}
