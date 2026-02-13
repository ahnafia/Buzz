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
                user.profileImagePath(), // This will be converted to signed URL in the service layer
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
    
    /**
     * Create UserProfile with signed URL generation for profile images
     */
    public static UserProfile fromWithSignedUrl(User user, int eventCount, int followerCount, int followingCount, 
                                               com.example.demo.Service.SupabaseStorageService storageService) {
        String profileImageUrl = null;
        if (user.profileImagePath() != null) {
            System.out.println("DEBUG: User has profile image path: " + user.profileImagePath());
            profileImageUrl = storageService.generateProfileImageUrl(user.profileImagePath());
            System.out.println("DEBUG: Generated profile image URL: " + profileImageUrl);
        } else {
            System.out.println("DEBUG: User profile image path is null");
        }
        
        return new UserProfile(
                user.id(),
                user.username(),
                user.displayName(),
                user.bio(),
                profileImageUrl,
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
