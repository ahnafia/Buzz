package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Flag(
        UUID id,
        UUID userId,
        String title,
        String description,
        double lat,
        double lon,
        String city,
        String addressText,  // Human-readable address for display
        String category,
        String imageUrl,
        boolean isPublic,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}