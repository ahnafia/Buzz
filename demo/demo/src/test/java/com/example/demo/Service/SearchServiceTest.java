package com.example.demo.Service;

import com.example.demo.Models.EventPin;
import com.example.demo.Models.EventsResponse;
import com.example.demo.Repositories.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {
    
    @Mock
    private EventRepository eventRepository;
    
    @Mock
    private GPTService gptService;
    
    private SearchService searchService;
    
    private EventPin musicEvent;
    private EventPin sportsEvent;
    private EventPin foodEvent;
    
    @BeforeEach
    void setUp() {
        searchService = new SearchService(eventRepository, gptService);
        
        // Create test events
        musicEvent = new EventPin(
                UUID.randomUUID(),
                "Jazz Concert",
                "Music",
                OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().plusDays(1).plusHours(3),
                "user1",
                40.7128,
                -74.0060,
                "Live jazz performance featuring local artists",
                "/images/jazz.jpg"
        );
        
        sportsEvent = new EventPin(
                UUID.randomUUID(),
                "Basketball Game",
                "Sports",
                OffsetDateTime.now().plusDays(2),
                OffsetDateTime.now().plusDays(2).plusHours(2),
                "user2",
                40.7589,
                -73.9851,
                "Professional basketball game at Madison Square Garden",
                "/images/basketball.jpg"
        );
        
        foodEvent = new EventPin(
                UUID.randomUUID(),
                "Food Festival",
                "Food",
                OffsetDateTime.now().plusDays(3),
                OffsetDateTime.now().plusDays(3).plusHours(8),
                "user3",
                40.7505,
                -73.9934,
                "Annual food festival with local vendors and live cooking demonstrations",
                "/images/food.jpg"
        );
    }
    
    @Test
    void testSearchEvents_ReturnsRelevantEvents_WhenGPTIdentifiesMatches() {
        // Arrange
        List<EventPin> nearbyEvents = Arrays.asList(musicEvent, sportsEvent, foodEvent);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        // Mock GPT responses - only music event is relevant to "jazz concert" query
        when(gptService.isContentRelevant(eq("jazz concert"), contains("Jazz Concert")))
                .thenReturn(true);
        when(gptService.isContentRelevant(eq("jazz concert"), contains("Basketball Game")))
                .thenReturn(false);
        when(gptService.isContentRelevant(eq("jazz concert"), contains("Food Festival")))
                .thenReturn(false);
        
        // Act
        EventsResponse result = searchService.searchEvents("jazz concert", 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.events().size());
        assertEquals(musicEvent.id(), result.events().get(0).id());
        assertEquals("Jazz Concert", result.events().get(0).title());
        
        // Verify repository was called with correct parameters
        verify(eventRepository).fetchPins(
                eq(-74.0060), eq(40.7128), eq(8046), // 5 miles = ~8046 meters
                any(OffsetDateTime.class), any(OffsetDateTime.class), 
                isNull(), eq(100) // minimum fetch limit is 100
        );
        
        // Verify GPT service was called for each event
        verify(gptService, times(3)).isContentRelevant(eq("jazz concert"), anyString());
    }
    
    @Test
    void testSearchEvents_ReturnsEmptyList_WhenNoEventsAreRelevant() {
        // Arrange
        List<EventPin> nearbyEvents = Arrays.asList(sportsEvent, foodEvent);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        // Mock GPT responses - no events are relevant
        when(gptService.isContentRelevant(anyString(), anyString()))
                .thenReturn(false);
        
        // Act
        EventsResponse result = searchService.searchEvents("classical music", 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.events().isEmpty());
        assertNull(result.nextCursor());
    }
    
    @Test
    void testSearchEvents_ReturnsEmptyList_WhenQueryIsEmpty() {
        // Act
        EventsResponse result = searchService.searchEvents("", 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.events().isEmpty());
        
        // Verify repository was not called
        verify(eventRepository, never()).fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), any(), anyInt());
        verify(gptService, never()).isContentRelevant(anyString(), anyString());
    }
    
    @Test
    void testSearchEvents_ReturnsEmptyList_WhenQueryIsNull() {
        // Act
        EventsResponse result = searchService.searchEvents(null, 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.events().isEmpty());
        
        // Verify repository was not called
        verify(eventRepository, never()).fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), any(), anyInt());
        verify(gptService, never()).isContentRelevant(anyString(), anyString());
    }
    
    @Test
    void testSearchEvents_ReturnsEmptyList_WhenQueryIsWhitespace() {
        // Act
        EventsResponse result = searchService.searchEvents("   ", 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.events().isEmpty());
        
        // Verify repository was not called
        verify(eventRepository, never()).fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), any(), anyInt());
        verify(gptService, never()).isContentRelevant(anyString(), anyString());
    }
    
    @Test
    void testSearchEvents_LimitsResults_WhenMoreRelevantEventsThanRequested() {
        // Arrange
        List<EventPin> nearbyEvents = Arrays.asList(musicEvent, sportsEvent, foodEvent);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        // Mock GPT responses - all events are relevant
        when(gptService.isContentRelevant(anyString(), anyString()))
                .thenReturn(true);
        
        // Act - request only 2 results
        EventsResponse result = searchService.searchEvents("events", 40.7128, -74.0060, 5.0, 2);
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.events().size());
    }
    
    @Test
    void testSearchEvents_HandlesRepositoryException_Gracefully() {
        // Arrange
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenThrow(new RuntimeException("Database connection failed"));
        
        // Act
        EventsResponse result = searchService.searchEvents("music", 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.events().isEmpty());
        
        // Verify GPT service was not called due to repository failure
        verify(gptService, never()).isContentRelevant(anyString(), anyString());
    }
    
    @Test
    void testSearchEvents_ContinuesProcessing_WhenGPTServiceFailsForSomeEvents() {
        // Arrange
        List<EventPin> nearbyEvents = Arrays.asList(musicEvent, sportsEvent, foodEvent);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        // Mock GPT responses - first call succeeds, second fails, third succeeds
        when(gptService.isContentRelevant(eq("music"), contains("Jazz Concert")))
                .thenReturn(true);
        when(gptService.isContentRelevant(eq("music"), contains("Basketball Game")))
                .thenThrow(new RuntimeException("GPT API timeout"));
        when(gptService.isContentRelevant(eq("music"), contains("Food Festival")))
                .thenReturn(false);
        
        // Act
        EventsResponse result = searchService.searchEvents("music", 40.7128, -74.0060, 5.0, 10);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.events().size());
        assertEquals(musicEvent.id(), result.events().get(0).id());
        
        // Verify all GPT calls were attempted
        verify(gptService, times(3)).isContentRelevant(eq("music"), anyString());
    }
    
    @Test
    void testSearchEvents_ConvertsRadiusCorrectly() {
        // Arrange
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(new ArrayList<>());
        
        // Act
        searchService.searchEvents("test", 40.7128, -74.0060, 10.0, 5);
        
        // Assert - verify radius conversion from miles to meters (10 miles ≈ 16093 meters)
        verify(eventRepository).fetchPins(
                eq(-74.0060), eq(40.7128), eq(16093),
                any(OffsetDateTime.class), any(OffsetDateTime.class),
                isNull(), anyInt()
        );
    }
    
    @Test
    void testSearchEvents_UsesFetchLimitMultiplier() {
        // Arrange
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(new ArrayList<>());
        
        // Act
        searchService.searchEvents("test", 40.7128, -74.0060, 5.0, 20);
        
        // Assert - verify fetch limit is 3x requested limit (20 * 3 = 60)
        verify(eventRepository).fetchPins(
                anyDouble(), anyDouble(), anyInt(),
                any(OffsetDateTime.class), any(OffsetDateTime.class),
                isNull(), eq(100) // minimum fetch limit is 100, so even 60 becomes 100
        );
    }
    
    @Test
    void testSearchEvents_UsesMinimumFetchLimit() {
        // Arrange
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(new ArrayList<>());
        
        // Act - request only 5 results
        searchService.searchEvents("test", 40.7128, -74.0060, 5.0, 5);
        
        // Assert - verify minimum fetch limit of 100 is used (5 * 3 = 15, but minimum is 100)
        verify(eventRepository).fetchPins(
                anyDouble(), anyDouble(), anyInt(),
                any(OffsetDateTime.class), any(OffsetDateTime.class),
                isNull(), eq(100)
        );
    }
    
    @Test
    void testBuildEventContent_CombinesAllFields() {
        // This tests the private method indirectly through the public interface
        // Arrange
        List<EventPin> nearbyEvents = Arrays.asList(musicEvent);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        when(gptService.isContentRelevant(anyString(), anyString()))
                .thenReturn(true);
        
        // Act
        searchService.searchEvents("test", 40.7128, -74.0060, 5.0, 10);
        
        // Assert - verify the combined content includes title, category, and description
        verify(gptService).isContentRelevant(eq("test"), argThat(content -> 
                content.contains("Title: Jazz Concert") &&
                content.contains("Category: Music") &&
                content.contains("Description: Live jazz performance featuring local artists")
        ));
    }
    
    @Test
    void testBuildEventContent_HandlesNullFields() {
        // Arrange
        EventPin eventWithNulls = new EventPin(
                UUID.randomUUID(),
                null, // null title
                null, // null category
                OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().plusDays(1).plusHours(3),
                "user1",
                40.7128,
                -74.0060,
                null, // null description
                null
        );
        
        List<EventPin> nearbyEvents = Arrays.asList(eventWithNulls);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        when(gptService.isContentRelevant(anyString(), anyString()))
                .thenReturn(true);
        
        // Act
        searchService.searchEvents("test", 40.7128, -74.0060, 5.0, 10);
        
        // Assert - verify fallback content is used
        verify(gptService).isContentRelevant(eq("test"), eq("Event with no description available."));
    }
    
    @Test
    void testBuildEventContent_HandlesEmptyFields() {
        // Arrange
        EventPin eventWithEmptyFields = new EventPin(
                UUID.randomUUID(),
                "", // empty title
                "  ", // whitespace category
                OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().plusDays(1).plusHours(3),
                "user1",
                40.7128,
                -74.0060,
                "", // empty description
                null
        );
        
        List<EventPin> nearbyEvents = Arrays.asList(eventWithEmptyFields);
        when(eventRepository.fetchPins(anyDouble(), anyDouble(), anyInt(), any(), any(), isNull(), anyInt()))
                .thenReturn(nearbyEvents);
        
        when(gptService.isContentRelevant(anyString(), anyString()))
                .thenReturn(true);
        
        // Act
        searchService.searchEvents("test", 40.7128, -74.0060, 5.0, 10);
        
        // Assert - verify fallback content is used when all fields are empty
        verify(gptService).isContentRelevant(eq("test"), eq("Event with no description available."));
    }
}