package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

public record TimeWindow(OffsetDateTime start, OffsetDateTime end) {
    
    public static TimeWindow from(TimeFilter filter, ZoneId zoneId) {
        OffsetDateTime now = OffsetDateTime.now(zoneId);
        
        return switch (filter) {
            case NOW -> {
                // Events happening right now (within the next hour)
                yield new TimeWindow(
                    now.minus(1, ChronoUnit.HOURS),
                    now.plus(1, ChronoUnit.HOURS)
                );
            }
            case TODAY -> {
                // Events for today
                OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
                OffsetDateTime endOfDay = startOfDay.plus(1, ChronoUnit.DAYS);
                yield new TimeWindow(startOfDay, endOfDay);
            }
            case THIS_WEEK -> {
                // Events for this week
                OffsetDateTime startOfWeek = now.truncatedTo(ChronoUnit.DAYS)
                    .minus(now.getDayOfWeek().getValue() - 1, ChronoUnit.DAYS);
                OffsetDateTime endOfWeek = startOfWeek.plus(7, ChronoUnit.DAYS);
                yield new TimeWindow(startOfWeek, endOfWeek);
            }
            case THIS_MONTH -> {
                // Events for this month
                OffsetDateTime startOfMonth = now.truncatedTo(ChronoUnit.DAYS)
                    .withDayOfMonth(1);
                OffsetDateTime endOfMonth = startOfMonth.plus(1, ChronoUnit.MONTHS);
                yield new TimeWindow(startOfMonth, endOfMonth);
            }
            case ALL -> {
                // All events (very wide range)
                yield new TimeWindow(
                    now.minus(1, ChronoUnit.YEARS),
                    now.plus(1, ChronoUnit.YEARS)
                );
            }
        };
    }
}