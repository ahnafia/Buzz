package com.example.demo.Controllers;

import com.example.demo.Models.EventsResponse;
import com.example.demo.Service.SearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping("/search")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class SearchController {

    private static final Logger logger = LoggerFactory.getLogger(SearchController.class);
    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * Search for events using intelligent semantic matching
     * @param query The user's search query (required)
     * @param lat Latitude for location filtering (required)
     * @param lon Longitude for location filtering (required)
     * @param radiusMiles Radius in miles for location filtering (optional, default: 5.0)
     * @param limit Maximum number of results to return (optional, default: 20)
     * @return EventsResponse containing relevant events
     */
    @GetMapping("/events")
    public ResponseEntity<?> searchEvents(
            @RequestParam String query,
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5.0") double radiusMiles,
            @RequestParam(defaultValue = "20") int limit
    ) {
        logger.info("Search request received - Query: '{}', Location: ({}, {}), Radius: {} miles, Limit: {}", 
                query, lat, lon, radiusMiles, limit);

        try {
            // Validate query parameter
            if (query == null || query.trim().isEmpty()) {
                logger.warn("Empty or null search query provided");
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Search query cannot be empty"));
            }

            // Validate location parameters
            if (!isValidLatitude(lat)) {
                logger.warn("Invalid latitude provided: {}", lat);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Latitude must be between -90 and 90 degrees"));
            }

            if (!isValidLongitude(lon)) {
                logger.warn("Invalid longitude provided: {}", lon);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Longitude must be between -180 and 180 degrees"));
            }

            // Validate radius parameter
            if (radiusMiles <= 0) {
                logger.warn("Invalid radius provided: {}", radiusMiles);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Radius must be greater than 0"));
            }

            if (radiusMiles > 100) {
                logger.warn("Radius too large: {}", radiusMiles);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Radius cannot exceed 100 miles"));
            }

            // Validate limit parameter
            if (limit <= 0) {
                logger.warn("Invalid limit provided: {}", limit);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Limit must be greater than 0"));
            }

            if (limit > 100) {
                logger.warn("Limit too large: {}", limit);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Limit cannot exceed 100"));
            }

            // Perform the search
            EventsResponse response = searchService.searchEvents(query.trim(), lat, lon, radiusMiles, limit);
            
            // Handle null response gracefully
            if (response == null) {
                logger.warn("SearchService returned null response");
                return ResponseEntity.ok(new EventsResponse(new ArrayList<>(), null));
            }
            
            logger.info("Search completed successfully - Found {} events", response.events().size());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument in search request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid request parameters: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error during search", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "An error occurred while processing your search. Please try again."));
        }
    }

    /**
     * Validates if the given latitude is within valid range
     * @param lat Latitude to validate
     * @return true if valid, false otherwise
     */
    private boolean isValidLatitude(double lat) {
        return lat >= -90.0 && lat <= 90.0 && !Double.isNaN(lat) && !Double.isInfinite(lat);
    }

    /**
     * Validates if the given longitude is within valid range
     * @param lon Longitude to validate
     * @return true if valid, false otherwise
     */
    private boolean isValidLongitude(double lon) {
        return lon >= -180.0 && lon <= 180.0 && !Double.isNaN(lon) && !Double.isInfinite(lon);
    }
}