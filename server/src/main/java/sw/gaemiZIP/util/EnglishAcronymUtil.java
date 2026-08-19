package sw.gaemiZIP.util;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class EnglishAcronymUtil {

    //알파벳 한글 발음
    private static final String[] LETTER_READINGS = {
            "에이","비","씨","디","이","에프","지","에이치","아이","제이",
            "케이","엘","엠","엔","오","피","큐","알","에스","티",
            "유","브이","더블유","엑스","와이","제트"
    };

    //낱자로 안읽는 예외 종목명 / 먼저 체크
    private static final Map<String, String> EXCEPTIONS = Map.of(
            "NAVER", "네이버",
            "POSCO", "포스코",
            "E1", "이원",
            "SOOP", "숲",
            "S-OIL", "에쓰오일",
            "KT&G", "케이티앤지"
    );

    //종목명 맨 앞 영문 2자 이상 추출
    private static final Pattern PREFIX_PATTERN = Pattern.compile("^[A-Za-z]{2,}");

    // 종목명에서 영문 접두어를 한글 발음으로 변환한 별칭 반환 없으면 null
    public static String toAlias(String stockName) {
        if (stockName == null || stockName.isBlank()) return null;

        String upper = stockName.toUpperCase();

        //예외 종목명 먼저 확인
        for (Map.Entry<String, String> e : EXCEPTIONS.entrySet()) {
            if (upper.startsWith(e.getKey())) {
                return e.getValue() + stockName.substring(e.getKey().length());
            }
        }

        //예외에 없으면 영문 접두어를 낱자별로 변환해서 조합

        Matcher m = PREFIX_PATTERN.matcher(stockName);
        if (!m.find()) return null;

        String prefix = m.group();
        StringBuilder reading = new StringBuilder();

        for (char c : prefix.toUpperCase().toCharArray()) {
            reading.append(LETTER_READINGS[c - 'A']);
        }

        return reading + stockName.substring(prefix.length());

    }

}
