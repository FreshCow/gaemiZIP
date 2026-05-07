package sw.scalperagent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.scalperagent.entity.News;
import java.util.List;

public interface NewsRepository extends JpaRepository<News, Long> {
    boolean existsByLink(String link);
    List<News> findTop10ByOrderByIdDesc();
}
