package sw.gaemiZIP.entity.board;

public enum BoardTag {
    DAILY("일상"), QUESTION("질문"), SHARE("공유"), STOCK("주식"), NOTICE("공지사항");

    private final String label;

    BoardTag(String label) { this.label = label; }
    public String getLabel() { return label; }
}
