package com.example.demo.Models;

import java.util.List;

public record EventsResponse(
        List<EventPin> events,
        String nextCursor  // null if no more results
) {
}
