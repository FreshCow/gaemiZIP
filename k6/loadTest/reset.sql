DELETE FROM trade_history WHERE member_id = (SELECT id FROM member_ant WHERE username = 'ssw8227');
DELETE FROM holding       WHERE member_id = (SELECT id FROM member_ant WHERE username = 'ssw8227');
UPDATE member_ant SET balance = 100000000 WHERE username = 'ssw8227';