\timing on
-- 게시글 100만 (author='seed_bench'로 표식)
insert into board (author, content, created_at, is_blinded, like_count, stock_name, tag, title, member_id, stock_code)
select 'seed_bench',
       repeat('벤치마크 시드 본문 ', 12) || g,
       now() - (random() * interval '730 days'),
       random() < 0.01,
       floor(power(random(), 8) * 100)::int,
       null,
       case when g % 100 = 0 then 'NOTICE'
            when g % 100 < 60 then 'DAILY'
            when g % 100 < 75 then 'QUESTION'
            when g % 100 < 85 then 'SHARE' else 'STOCK' end,
       '벤치마크 시드 제목 ' || g,
       (select id from member_ant order by id limit 1),
       null
from generate_series(1, 1000000) g;

-- 댓글 300만 (일부 게시글에 편중)
with r as (select min(id) lo, max(id) hi from board where author='seed_bench')
insert into comment (author, content, created_at, is_blinded, like_count, board_id)
select 'seed_bench', '벤치마크 시드 댓글 ' || g, now() - (random() * interval '700 days'), random() < 0.01, 0,
       r.lo + floor(power(random(), 2) * (r.hi - r.lo + 1))::bigint
from generate_series(1, 3000000) g, r;

analyze board; analyze comment;
select 'board' t, count(*) from board union all select 'comment', count(*) from comment;
select pg_size_pretty(pg_total_relation_size('board')) board_size, pg_size_pretty(pg_total_relation_size('comment')) comment_size;
