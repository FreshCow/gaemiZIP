package sw.gaemiZIP.repository.admin;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AdminStatsRepositoryImpl implements AdminStatsRepository {
    private final JPAQueryFactory queryFactory;

}
