package com.example.demo.Models;

import java.time.OffsetDateTime;

public record UpdateEventRequest(
        String title,           // optional
        String category,        // optional
        Double lat,             // optional
        Double lon,             // optional
        OffsetDateTime startTime, // optional
        OffsetDateTime endTime,   // optional
        String description      // optional
) {
}
