SELECT
  (SELECT count(*) FROM trade_history WHERE trade_type='BUY' AND member_id=m.id)  AS history_cnt,
  (SELECT coalesce(sum(quantity),0) FROM holding WHERE member_id=m.id)            AS holding_qty,
  (SELECT count(*) FROM holding WHERE member_id=m.id)                             AS holding_rows,
  m.balance
FROM member_ant m WHERE m.username = 'ssw8227';