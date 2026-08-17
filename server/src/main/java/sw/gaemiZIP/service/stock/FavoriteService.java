package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.stock.FavoriteResponse;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.Favorite;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.FavoriteRepository;
import sw.gaemiZIP.repository.stock.StockRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final MemberAntRepository memberAntRepository;
    private final FavoriteRepository favoriteRepository;
    private final StockRepository stockRepository;

    public List<FavoriteResponse> getFavorites(String email) {
        MemberAnt member = findMember(email);
        return favoriteRepository.findAllByMember_IdOrderByCreatedDateDesc(member.getId())
                .stream()
                .map(FavoriteResponse::from)
                .toList();
    }

    // 이미 즐겨찾기된 종목이면 아무 것도 하지 않음 (버튼 연타·중복 요청에 안전)
    @Transactional
    public void addFavorite(String email, String stockCode, String stockName) {
        MemberAnt member = findMember(email);
        if (favoriteRepository.existsByMember_IdAndStock_Code(member.getId(), stockCode)) return;
        favoriteRepository.save(Favorite.builder()
                .member(member)
                .stock(stockRepository.getReferenceById(stockCode))
                .stockName(stockName)
                .build());
    }

    @Transactional
    public void removeFavorite(String email, String stockCode) {
        MemberAnt member = findMember(email);
        favoriteRepository.deleteByMember_IdAndStock_Code(member.getId(), stockCode);
    }

    private MemberAnt findMember(String loginId) {
        return memberAntRepository.findByUsernameOrEmail(loginId, loginId)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
    }
}
