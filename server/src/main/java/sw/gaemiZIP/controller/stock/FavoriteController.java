package sw.gaemiZIP.controller.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.FavoriteRequest;
import sw.gaemiZIP.dto.stock.FavoriteResponse;
import sw.gaemiZIP.dto.stock.FavoriteCountResponse;
import sw.gaemiZIP.service.stock.FavoriteService;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping("/{code}/count")
    public ResponseEntity<FavoriteCountResponse> getCount(@PathVariable String code) {
        return ResponseEntity.ok(new FavoriteCountResponse(favoriteService.getCount(code)));
    }

    @GetMapping
    public ResponseEntity<List<FavoriteResponse>> getFavorites(Authentication auth) {
        return ResponseEntity.ok(favoriteService.getFavorites(auth.getName()));
    }

    @PostMapping("/{code}")
    public ResponseEntity<Void> addFavorite(
            @PathVariable String code,
            @RequestBody FavoriteRequest request,
            Authentication auth
    ) {
        favoriteService.addFavorite(auth.getName(), code, request.getStockName());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> removeFavorite(@PathVariable String code, Authentication auth) {
        favoriteService.removeFavorite(auth.getName(), code);
        return ResponseEntity.noContent().build();
    }
}
