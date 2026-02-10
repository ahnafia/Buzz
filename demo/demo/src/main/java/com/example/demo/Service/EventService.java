package com.example.demo.Service;
import com.example.demo.Models.*;
import com.example.demo.Repositories.EventRepository;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    private static final int MAX_RADIUS_M = 40000; // ~25 mi
    private static final int MIN_RADIUS_M = 100;
    private static final int MAX_LIMIT = 500;

    private final EventRepository repo;
    private final ZoneId appZone;

    public EventService(EventRepository repo) {
        this.repo = repo;
        // choose your app timezone (campus-based). Change if needed.
        this.appZone = ZoneId.of("America/New_York");
    }

    public List<EventPin> getPins(
            double lat,
            double lon,
            int radiusM,
            String timeFilterRaw,
            List<String> categories,
            int limit
    ) {
        int clampedRadius = clamp(radiusM, MIN_RADIUS_M, MAX_RADIUS_M);
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        TimeFilter tf = TimeFilter.from(timeFilterRaw);
        TimeWindow w = TimeWindow.from(tf, appZone);

        return repo.fetchPins(
                lon, lat,
                clampedRadius,
                w.start(), w.end(),
                categories,
                clampedLimit
        );
    }

    public EventPin getEventById(UUID id) {
        return repo.fetchEventById(id);
    }

    public List<EventPin> getEventsByOwner(String owner, int limit) {
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);
        return repo.fetchEventsByOwner(owner, clampedLimit);
    }

    public EventsResponse getEvents(
            double lat,
            double lon,
            double radiusMiles,
            String timeWindow,
            List<String> categories,
            String cursor,
            int limit
    ) {
        // Convert miles to meters (1 mile = 1609.34 meters)
        int radiusM = (int) (radiusMiles * 1609.34);
        int clampedRadius = clamp(radiusM, MIN_RADIUS_M, MAX_RADIUS_M);
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        TimeFilter tf = TimeFilter.from(timeWindow);
        TimeWindow w = TimeWindow.from(tf, appZone);

        List<EventPin> events = repo.fetchPinsWithCursor(
                lon, lat,
                clampedRadius,
                w.start(), w.end(),
                categories,
                cursor,
                clampedLimit + 1  // Fetch one extra to check if there's more
        );

        String nextCursor = null;
        if (events.size() > clampedLimit) {
            // Remove the extra item and use last event's ID as cursor
            events = events.subList(0, clampedLimit);
            nextCursor = events.get(events.size() - 1).id().toString();
        }

        return new EventsResponse(events, nextCursor);
    }

    public EventPin getEventByIdActive(UUID id) {
        return repo.fetchEventByIdActive(id);
    }

    public EventPin createEvent(CreateEventRequest request, String owner) {
        // Compute expires_at: if end_time provided, use it; otherwise use start_time + 24 hours
        OffsetDateTime expiresAt = request.endTime() != null 
            ? request.endTime() 
            : request.startTime().plusHours(24);

        UUID eventId = repo.createEvent(
                request.title(),
                request.category(),
                request.lat(),
                request.lon(),
                request.startTime(),
                expiresAt,
                owner,
                request.description()
        );

        return repo.fetchEventById(eventId);
    }

    public EventPin updateEvent(UUID eventId, UpdateEventRequest request, String owner) {
        // Check ownership
        String eventOwner = repo.getOwner(eventId);
        if (eventOwner == null) {
            return null; // Event not found
        }
        if (!eventOwner.equals(owner)) {
            throw new SecurityException("You can only update events you own");
        }

        // Get current event to compute new expires_at if times change
        EventPin currentEvent = repo.fetchEventById(eventId);
        if (currentEvent == null) {
            return null;
        }

        OffsetDateTime newExpiresAt = null;
        if (request.startTime() != null || request.endTime() != null) {
            // Times changed, recompute expires_at
            OffsetDateTime newStartTime = request.startTime() != null ? request.startTime() : currentEvent.startTime();
            newExpiresAt = request.endTime() != null 
                ? request.endTime() 
                : newStartTime.plusHours(24);
        }

        boolean updated = repo.updateEvent(
                eventId,
                request.title(),
                request.category(),
                request.lat(),
                request.lon(),
                request.startTime(),
                newExpiresAt,
                request.description()
        );

        return updated ? repo.fetchEventById(eventId) : null;
    }

    public boolean deleteEvent(UUID eventId, String owner) {
        log.debug("Attempting to delete event {} by owner {}", eventId, owner);
        
        // Check ownership
        String eventOwner = repo.getOwner(eventId);
        log.debug("Event {} owner from DB: {}", eventId, eventOwner);
        
        if (eventOwner == null) {
            log.warn("Event {} not found", eventId);
            return false; // Event not found
        }
        if (!eventOwner.equals(owner)) {
            log.warn("Owner mismatch for event {}: DB owner={}, request owner={}", eventId, eventOwner, owner);
            throw new SecurityException("You can only delete events you own");
        }

        boolean result = repo.deleteEvent(eventId);
        log.debug("Delete event {} result: {}", eventId, result);
        return result;
    }

    public EventsResponse getMyEvents(
            String owner,
            String status,
            String cursor,
            int limit
    ) {
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        List<EventPin> events = repo.fetchEventsByOwnerWithStatus(
                owner,
                status,
                cursor,
                clampedLimit + 1  // Fetch one extra to check if there's more
        );

        String nextCursor = null;
        if (events.size() > clampedLimit) {
            // Remove the extra item and use last event's ID as cursor
            events = events.subList(0, clampedLimit);
            nextCursor = events.get(events.size() - 1).id().toString();
        }

        return new EventsResponse(events, nextCursor);
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
