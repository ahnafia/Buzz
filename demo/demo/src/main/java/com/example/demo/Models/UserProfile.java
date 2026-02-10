package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public profile view - excludes sensitive info like email
 */
public record UserProfile(
        UUID id,
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        UserType userType,
        // Location (only if user allows)
        Double lat,
        Double lon,
        String city,
        String addressText,  // Human-readable address for display
        // Business info
        String businessName,
        String businessCategory,
        // Stats
        int eventCount,
        int followerCount,
        int followingCount,
        // Status
        boolean verified,
        OffsetDateTime createdAt
) {
    public static UserProfile from(User user, int eventCount, int followerCount, int followingCount) {
        return new UserProfile(
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
                eventCount,
                followerCount,
                followingCount,
                user.verified(),
                user.createdAt()
        );
    }
}
