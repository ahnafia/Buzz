package com.example.demo.Service;

import com.example.demo.Models.EventPin;
import com.example.demo.Models.EventsResponse;
import com.example.demo.Repositories.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for intelligent event search using GPT-powered semantic analysis
 */
@Service
public class SearchService {
    
    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);
    
    private final EventRepository eventRepository;
    private final GPTService gptService;
    
    @Autowired
    public SearchService(EventRepository eventRepository, GPTService gptService) {
        this.eventRepository = eventRepository;
        this.gptService = gptService;
    }
    
    /**
     * Searches for events using intelligent semantic matching
     * @param query The user's search query
     * @param lat Latitude for location filtering
     * @param lon Longitude for location filtering
     * @param radiusMiles Radius in miles for location filtering
     * @param limit Maximum number of results to return
     * @return EventsResponse containing relevant events
     */
    public EventsResponse searchEvents(String query, double lat, double lon, double radiusMiles, int limit) {
        logger.info("Starting intelligent search for query: '{}' at location ({}, {}) within {} miles", 
                query, lat, lon, radiusMiles);
        
        // Validate input
        if (query == null || query.trim().isEmpty()) {
            logger.warn("Empty search query provided");
            return new EventsResponse(new ArrayList<>(), null);
        }
        
        try {
            // Convert miles to meters for the repository call
            int radiusMeters = (int) (radiusMiles * 1609.34);
            
            // Fetch events within the specified location radius
            // Using a larger limit initially to have more events to filter through
            int fetchLimit = Math.max(limit * 3, 100); // Fetch 3x the requested limit or 100, whichever is larger
            
            List<EventPin> nearbyEvents = eventRepository.fetchPins(
                lon, lat, radiusMeters, 
                OffsetDateTime.now().minusHours(1), // Start time - allow events that started recently
                OffsetDateTime.now().plusYears(1),  // End time - look ahead 1 year
                null, // No category filter
                fetchLimit
            );
            
            logger.debug("Found {} nearby events to analyze", nearbyEvents.size());
            
            // Filter events by relevance using GPT
            List<EventPin> relevantEvents = filterEventsByRelevance(query.trim(), nearbyEvents);
            
            // Limit results to requested amount
            List<EventPin> finalResults = relevantEvents.stream()
                    .limit(limit)
                    .collect(Collectors.toList());
            
            logger.info("Search completed. Found {} relevant events out of {} nearby events", 
                    finalResults.size(), nearbyEvents.size());
            
            return new EventsResponse(finalResults, null);
            
        } catch (Exception e) {
            logger.error("Error during event search", e);
            // Return empty results on error rather than throwing exception
            return new EventsResponse(new ArrayList<>(), null);
        }
    }
    
    /**
     * Filters a list of events by relevance to the search query using GPT analysis
     * @param query The search query
     * @param events List of events to filter
     * @return List of events that are relevant to the query
     */
    private List<EventPin> filterEventsByRelevance(String query, List<EventPin> events) {
        logger.debug("Filtering {} events for relevance to query: '{}'", events.size(), query);
        
        List<EventPin> relevantEvents = new ArrayList<>();
        int processedCount = 0;
        int relevantCount = 0;
        
        for (EventPin event : events) {
            try {
                boolean isRelevant = isEventRelevant(query, event);
                processedCount++;
                
                if (isRelevant) {
                    relevantEvents.add(event);
                    relevantCount++;
                    logger.debug("Event '{}' marked as relevant", event.title());
                } else {
                    logger.debug("Event '{}' marked as not relevant", event.title());
                }
                
            } catch (Exception e) {
                logger.warn("Error checking relevance for event '{}': {}", event.title(), e.getMessage());
                // Continue processing other events rather than failing completely
            }
        }
        
        logger.debug("Relevance filtering complete: {}/{} events marked as relevant", 
                relevantCount, processedCount);
        
        return relevantEvents;
    }
    
    /**
     * Determines if a single event is relevant to the search query using GPT analysis
     * @param query The search query
     * @param event The event to check
     * @return true if the event is relevant, false otherwise
     */
    private boolean isEventRelevant(String query, EventPin event) {
        try {
            // Combine event content for analysis
            String eventContent = buildEventContent(event);
            
            // Use GPT service to determine relevance
            boolean isRelevant = gptService.isContentRelevant(query, eventContent);
            
            logger.debug("GPT analysis for event '{}': {}", event.title(), isRelevant ? "RELEVANT" : "NOT RELEVANT");
            
            return isRelevant;
            
        } catch (Exception e) {
            logger.warn("Error during GPT relevance check for event '{}': {}. Defaulting to not relevant.", 
                    event.title(), e.getMessage());
            // Default to not relevant on any error to avoid including potentially irrelevant results
            return false;
        }
    }
    
    /**
     * Builds a combined content string from event fields for GPT analysis
     * @param event The event to build content for
     * @return Combined content string
     */
    private String buildEventContent(EventPin event) {
        StringBuilder content = new StringBuilder();
        
        // Add title (most important)
        if (event.title() != null && !event.title().trim().isEmpty()) {
            content.append("Title: ").append(event.title().trim()).append(". ");
        }
        
        // Add category
        if (event.category() != null && !event.category().trim().isEmpty()) {
            content.append("Category: ").append(event.category().trim()).append(". ");
        }
        
        // Add description (if available)
        if (event.description() != null && !event.description().trim().isEmpty()) {
            content.append("Description: ").append(event.description().trim()).append(". ");
        }
        
        // If no content was found, use a minimal description
        if (content.length() == 0) {
            content.append("Event with no description available.");
        }
        
        return content.toString();
    }
}