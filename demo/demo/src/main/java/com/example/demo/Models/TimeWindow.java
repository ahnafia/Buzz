package com.example.demo.Models;

import java.time.*;

public record TimeWindow(OffsetDateTime start, OffsetDateTime end) {

    public static TimeWindow from(TimeFilter filter, ZoneId zone) {
        OffsetDateTime now = OffsetDateTime.now(zone);

        return switch (filter) {
            case NOW -> new TimeWindow(now, now.plusHours(2));

            case TONIGHT -> {
                // "Tonight" = today 6pm → tomorrow 3am in the chosen zone
                LocalDate today = LocalDate.now(zone);
                ZonedDateTime startZ = today.atTime(18, 0).atZone(zone);
                ZonedDateTime endZ = today.plusDays(1).atTime(3, 0).atZone(zone);

                // If it's already past 3am tomorrow window doesn't make sense; fallback to next "tonight"
                if (ZonedDateTime.now(zone).isAfter(endZ)) {
                    startZ = today.plusDays(1).atTime(18, 0).atZone(zone);
                    endZ = today.plusDays(2).atTime(3, 0).atZone(zone);
                }
                yield new TimeWindow(startZ.toOffsetDateTime(), endZ.toOffsetDateTime());
            }

            case WEEK -> new TimeWindow(now, now.plusDays(7));
        };
    }
}
