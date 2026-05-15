package sw.gaemiZIP.util;

public class InitialUtil {
    private static final char[] initial = {
            'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
            'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    };

    //초성 추출 로직
    public static String getInitial(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder();

        for(char c : text.toCharArray()) {
            if(c >= 0xAC00 && c <= 0xD7A3) { //한글 판별
                int initialIndex = (c - 0xAC00) / (21 * 28);
                sb.append(initial[initialIndex]);
            }else{ //숫자, 영어는 그대로
                sb.append(c);
            }
        }
        return sb.toString();
    }

}
