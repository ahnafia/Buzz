package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EnhancedUserProfile(
        UUID id,
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        UserType userType,
        Double lat,
        Double lon,
        String city,
        String addressText,  // Human-readable address for display
        String businessName,
        String businessCategory,
        // Stats
        int followerCount,
        int followingCount,
        int eventCount,
        int landmarkCount,
        int flagCount,
        int totalLikesGiven,
        boolean verified,
        OffsetDateTime createdAt,
        // Embedded collections
        List<Landmark> landmarks,
        List<Flag> recentFlags,
        List<FlagWithLikeCount> flagsWithLikeCounts
) {
    public static EnhancedUserProfile from(
            User user,
            int followerCount,
            int followingCount,
            int eventCount,
            int landmarkCount,
            int flagCount,
            int totalLikesGiven,
            List<Landmark> landmarks,
            List<Flag> recentFlags,
            List<FlagWithLikeCount> flagsWithLikeCounts
    ) {
        return new EnhancedUserProfile(
                user.id(),
                user.username(),
                user.displayName(),
                user.bio(),
                user.profileImageUrl(),
                user.userType(),
                user.locationVisible() ? user.lat() : null,
                user.locationVisible() ? user.lon() : null,
                user.city(),
                user.addressText(),
                user.businessName(),
                user.businessCategory(),
                followerCount,
                followingCount,
                eventCount,
                landmarkCount,
                flagCount,
                totalLikesGiven,
                user.verified(),
                user.createdAt(),
                landmarks,
                recentFlags,
                flagsWithLikeCounts
        );
    }
}