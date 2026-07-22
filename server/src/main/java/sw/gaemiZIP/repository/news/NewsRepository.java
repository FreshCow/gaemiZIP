package sw.gaemiZIP.repository.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.news.News;
import java.util.List;

public interface NewsRepository extends JpaRepository<News, Long> {
    boolean existsByLink(String link);

    Page<News> findAllByOrderByIdDesc(Pageable pageable);
}
