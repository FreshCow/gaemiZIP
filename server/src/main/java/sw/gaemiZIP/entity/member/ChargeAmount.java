package sw.gaemiZIP.entity.member;

public enum ChargeAmount {
    //1억
    HUNDRED_MILLION(100_000_000L),
    //5억
    FIVE_HUNDRED_MILLION(500_000_000L),
    //10억
    ONE_BILLION(1_000_000_000L),
    //30억
    THREE_BILLION(3_000_000_000L),
    //50억
    FIVE_BILLION(5_000_000_000L);

    private final long amount;

    ChargeAmount(long amount) {
        this.amount = amount;
    }

    public long getAmount() {
        return amount;
    }
}
