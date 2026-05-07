package sw.gaemiZIP.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Role {

    USER("ROLE_USER", "일반 개미"),
    ADMIN("ROLE_ADMIN", "왕 개미");

    private final String key;
    private final String titles;
}
