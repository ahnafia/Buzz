package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SimpleEvent(
        UUID id,
        String title,
        String category,
        OffsetDateTime startTime,
        double lat,
        double lon
) {
    public static SimpleEvent from(EventPin pin) {
        return new SimpleEvent(
                pin.id(),
                pin.title(),
                pin.category(),
                pin.startTime(),
                pin.lat(),
                pin.lon()
        );
    }
}
