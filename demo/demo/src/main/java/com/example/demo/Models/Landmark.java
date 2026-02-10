package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Landmark(
        UUID id,
        UUID userId,
        String name,
        String description,
        double lat,
        double lon,
        String city,
        String addressText,  // Human-readable address for display
        String category,
        int visitCount,
        OffsetDateTime lastVisitedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}