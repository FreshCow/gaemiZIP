\echo '== Q1 findAllForList (tag=null, 전체 로드) =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and (null is null or b.tag=null) order by case when b.tag='NOTICE' then 0 else 1 end, b.created_at desc;
\echo '== Q1b findAllForList (tag=STOCK) =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.tag='STOCK' order by case when b.tag='NOTICE' then 0 else 1 end, b.created_at desc;
\echo '== Q2 findPopular (7일, 15좋아요, limit 5) =='
explain (analyze, buffers) select * from board b where b.is_blinded=false and b.created_at >= now()-interval '7 days' and b.like_count>=15 order by b.like_count desc limit 5;
\echo '== Q3 countByBoardIdGroup =='
explain (analyze, buffers) select c.board_id, count(*) from comment c group by c.board_id;
\echo '== Q4 댓글 board_id 단건 조회 =='
explain (analyze, buffers) select * from comment c where c.board_id=500000 order by c.created_at asc;
\echo '== Q5 게시글 삭제 (CASCADE, 트랜잭션 롤백) =='
begin;
explain (analyze, buffers) delete from board where id=(select id from board where author='seed_bench' order by id offset 500000 limit 1);
rollback;
