package com.example.demo.Models;

import java.time.OffsetDateTime;

public record CreateEventRequest(
        String title,
        String category,
        double lat,
        double lon,
        OffsetDateTime startTime,
        OffsetDateTime endTime,  // optional
        String description       // optional
) {
}
