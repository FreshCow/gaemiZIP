package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sw.gaemiZIP.dto.stock.FavoriteResponse;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.FavoriteRepository;
import sw.gaemiZIP.repository.stock.StockRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final MemberAntRepository memberAntRepository;
    private final FavoriteRepository favoriteRepository;
    private final StockRepository stockRepository;

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getFavorites(String email) {
        MemberAnt member = findMember(email);
        return favoriteRepository.findAllByMember_IdOrderByCreatedDateDesc(member.getId())
                .stream()
                .map(FavoriteResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getCount(String stockCode) {
        return favoriteRepository.countByStock_Code(stockCode);
    }

    @Transactional
    public void addFavorite(String email, String stockCode, String stockName) {
        MemberAnt member = findMember(email);
        if (stockName == null || stockName.isBlank() || stockName.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종목명이 올바르지 않습니다.");
        }
        if (!stockRepository.existsById(stockCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "종목을 찾을 수 없습니다.");
        }
        favoriteRepository.insertIfAbsent(member.getId(), stockCode, stockName.trim(), LocalDateTime.now());
    }

    @Transactional
    public void removeFavorite(String email, String stockCode) {
        MemberAnt member = findMember(email);
        favoriteRepository.deleteByMember_IdAndStock_Code(member.getId(), stockCode);
    }

    private MemberAnt findMember(String loginId) {
        return memberAntRepository.findByUsernameOrEmail(loginId, loginId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원을 찾을 수 없습니다."));
    }
}
