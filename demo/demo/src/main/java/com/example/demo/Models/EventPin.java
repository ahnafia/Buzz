package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventPin(
        UUID id,
        String title,
        String category,
        OffsetDateTime startTime,
        OffsetDateTime expiresAt,
        String owner,
        double lat,
        double lon
) {
}
