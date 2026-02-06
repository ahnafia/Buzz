package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

public record User(
        UUID id,
        String username,
        String email,
        String displayName,
        String bio,
        String profileImageUrl,
        UserType userType,
        // Location - for the map-based social network
        Double lat,
        Double lon,
        String city,
        // For business accounts (clubs, restaurants)
        String businessName,
        String businessCategory,
        // Privacy & status
        boolean locationVisible,
        boolean profilePublic,
        boolean verified,
        // Timestamps
        OffsetDateTime createdAt,
        OffsetDateTime lastActiveAt
) {
    // Convenience constructor for basic user creation
    public User(UUID id, String username, String email, String displayName, UserType userType) {
        this(id, username, email, displayName, null, null, userType, 
             null, null, null, null, null, true, true, false, 
             OffsetDateTime.now(), OffsetDateTime.now());
    }
}
