package com.example.demo.Service;

import com.example.demo.Models.*;
import com.example.demo.Repositories.FlagRepository;
import com.example.demo.Repositories.FlagLikeRepository;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import com.example.demo.Models.Flag;


@Service
public class FlagService {
    private final FlagRepository repo;
    private final FlagLikeRepository likeRepo;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_RADIUS_M = 40000; // ~25 miles

    public FlagService(FlagRepository repo, FlagLikeRepository likeRepo) {
        this.repo = repo;
        this.likeRepo = likeRepo;
    }

    public Flag createFlag(CreateFlagRequest request, UUID userId) {
        OffsetDateTime expiresAt = request.isPublic() != null ? 
                OffsetDateTime.now().plusDays(7) : null;

        UUID flagId = repo.createFlag(
                userId,
                request.title(),
                request.description(),
                request.lat(),
                request.lon(),
                request.city(),
                request.addressText(),
                request.category(),
                request.imageUrl(),
                request.isPublic() != null ? request.isPublic() : true,
                expiresAt
        );
        return repo.fetchFlagById(flagId);
    }

    public Flag getFlagById(UUID id) {
        return repo.fetchFlagById(id);
    }

    public List<Flag> getUserFlags(UUID userId, int limit) {
        int clampedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        return repo.fetchFlagsByUser(userId, clampedLimit);
    }

    public List<Flag> getFlagsNearby(double lat, double lon, double radiusMiles, int limit) {
        int radiusM = (int) (radiusMiles * 1609.34);
        int clampedRadius = Math.max(100, Math.min(radiusM, MAX_RADIUS_M));
        int clampedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        return repo.fetchFlagsNearby(lon, lat, clampedRadius, clampedLimit);
    }

    public Flag updateFlag(UUID flagId, UpdateFlagRequest request) {
        boolean updated = repo.updateFlag(
                flagId,
                request.title(),
                request.description(),
                request.city(),
                request.addressText(),
                request.category(),
                request.imageUrl(),
                request.isPublic()
        );
        return updated ? repo.fetchFlagById(flagId) : null;
    }

    public boolean deleteFlag(UUID flagId) {
        return repo.deleteFlag(flagId);
    }

    public int countUserFlags(UUID userId) {
        return repo.countUserFlags(userId);
    }

    public boolean likeFlag(UUID flagId, UUID userId) {
        likeRepo.likeFlag(flagId, userId);
        return true;
    }

    public boolean unlikeFlag(UUID flagId, UUID userId) {
        return likeRepo.unlikeFlag(flagId, userId);
    }

    public boolean isLiked(UUID flagId, UUID userId) {
        return likeRepo.isLikedByUser(flagId, userId);
    }

    public int getLikeCount(UUID flagId) {
        return likeRepo.countLikes(flagId);
    }

    public int getUserLikeCount(UUID userId) {
        return likeRepo.countLikesGivenByUser(userId);
    }

    // ==================== LIKES (FLAGS LIKED BY USER) ====================

public List<Flag> getFlagsLikedByUser(UUID userId, int limit) {
    int clampedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
    return likeRepo.fetchFlagsLikedByUser(userId, null, clampedLimit);
}

public int getLikesGivenCount(UUID userId) {
    return likeRepo.countLikesGivenByUser(userId); // you already have this
}


}