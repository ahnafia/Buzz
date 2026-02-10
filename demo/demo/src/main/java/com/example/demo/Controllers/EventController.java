package com.example.demo.Controllers;
import com.example.demo.Models.*;
import com.example.demo.Service.EventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/events")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class EventController {

    private final EventService service;

    public EventController(EventService service) {
        this.service = service;
    }

    @GetMapping
    public EventsResponse getEvents(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5.0") double radiusMiles,
            @RequestParam(required = false) String timeWindow,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return service.getEvents(lat, lon, radiusMiles, timeWindow, category, cursor, limit);
    }

    @GetMapping("/pins")
    public List<EventPin> getEventPins(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5.0") double radiusMiles,
            @RequestParam(required = false) String timeWindow,
            @RequestParam(required = false) List<String> category,
            @RequestParam(defaultValue = "20") int limit
    ) {
        // Convert miles to meters (1 mile = 1609.34 meters)
        int radiusM = (int) (radiusMiles * 1609.34);
        return service.getPins(lat, lon, radiusM, timeWindow, category, limit);
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<EventPin> getEventById(@PathVariable String eventId) {
        try {
            UUID id = UUID.fromString(eventId);
            EventPin event = service.getEventByIdActive(id);
            
            if (event == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(event);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping
    public ResponseEntity<EventPin> createEvent(
            @RequestBody CreateEventRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "anonymous") String owner
    ) {
        try {
            EventPin event = service.createEvent(request, owner);
            return ResponseEntity.status(HttpStatus.CREATED).body(event);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{eventId}")
    public ResponseEntity<EventPin> updateEvent(
            @PathVariable String eventId,
            @RequestBody UpdateEventRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "anonymous") String owner
    ) {
        try {
            UUID id = UUID.fromString(eventId);
            EventPin event = service.updateEvent(id, request, owner);
            
            if (event == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(event);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable String eventId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "anonymous") String owner
    ) {
        System.out.println("DELETE /events/" + eventId + " - Owner: " + owner);
        try {
            UUID id = UUID.fromString(eventId);
            boolean deleted = service.deleteEvent(id, owner);
            
            if (!deleted) {
                System.out.println("Event not found: " + eventId);
                return ResponseEntity.notFound().build();
            }
            
            System.out.println("Event deleted successfully: " + eventId);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            System.out.println("Security exception for event " + eventId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            System.out.println("Invalid event ID: " + eventId);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/mine")
    public EventsResponse getMyEvents(
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "anonymous") String owner,
            @RequestParam(required = false, defaultValue = "active") String status,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return service.getMyEvents(owner, status, cursor, limit);
    }
}