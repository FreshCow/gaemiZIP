package sw.gaemiZIP.dto.moderation;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public record ModerateResponse(@JsonProperty("is_blocked") boolean isBlocked,
                               @JsonProperty("clean_score") double cleanScore,
                               Map<String, Double> labels,
                               @JsonProperty("triggered_labels") List<String> triggeredLabels) {

}
