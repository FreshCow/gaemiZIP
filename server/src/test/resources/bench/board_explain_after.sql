analyze board; analyze comment;
\echo '== A1 findNotices =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.tag='NOTICE' order by b.created_at desc;
\echo '== A2 findPage (공지 제외, 20건) =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.tag<>'NOTICE' order by b.created_at desc limit 21;
\echo '== A2b findPage page=1000 =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.tag<>'NOTICE' order by b.created_at desc limit 21 offset 20000;
\echo '== A3 findPageByTag STOCK =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.tag='STOCK' order by b.created_at desc limit 21;
\echo '== A4 findPopular =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.created_at >= now()-interval '7 days' and b.like_count>=15 order by b.like_count desc limit 5;
\echo '== A5 countByBoardIdIn (20 ids) =='
explain (analyze, buffers) select c.board_id, count(*) from comment c where c.board_id in (1000,2000,3000,4000,5000,6000,7000,8000,9000,10000,11000,12000,13000,14000,15000,16000,17000,18000,19000,20000) group by c.board_id;
\echo '== A6 댓글 board_id 조회 =='
explain (analyze, buffers) select * from comment c where c.board_id=500000 order by c.created_at asc;
\echo '== A7 게시글 삭제 CASCADE =='
begin;
explain (analyze, buffers) delete from board where id=(select id from board where author='seed_bench' order by id offset 500000 limit 1);
rollback;
