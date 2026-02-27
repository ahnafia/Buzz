package com.example.demo;

import com.example.demo.Controllers.SearchController;
import com.example.demo.Models.EventPin;
import com.example.demo.Models.EventsResponse;
import com.example.demo.Service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SearchController.class)
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SearchService searchService;

    private EventPin testEvent;
    private EventsResponse testResponse;

    @BeforeEach
    void setUp() {
        testEvent = new EventPin(
                UUID.randomUUID(),
                "Test Event",
                "Music",
                OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().plusDays(1).plusHours(3),
                "testuser",
                40.7128,
                -74.0060,
                "This is a test event description",
                null
        );

        testResponse = new EventsResponse(List.of(testEvent), null);
    }

    @Nested
    @DisplayName("GET /search/events - Search Events")
    class SearchEventsTests {

        @Test
        @DisplayName("Should return search results for valid query")
        void searchEvents_ValidQuery_ReturnsResults() throws Exception {
            when(searchService.searchEvents("music concert", 40.7128, -74.0060, 5.0, 20))
                    .thenReturn(testResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "music concert")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.events").isArray())
                    .andExpect(jsonPath("$.events[0].title").value("Test Event"))
                    .andExpect(jsonPath("$.events[0].category").value("Music"))
                    .andExpect(jsonPath("$.nextCursor").doesNotExist());

            verify(searchService).searchEvents("music concert", 40.7128, -74.0060, 5.0, 20);
        }

        @Test
        @DisplayName("Should return empty results when no events found")
        void searchEvents_NoResults_ReturnsEmptyList() throws Exception {
            EventsResponse emptyResponse = new EventsResponse(new ArrayList<>(), null);
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
                    .thenReturn(emptyResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "nonexistent event")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.events").isArray())
                    .andExpect(jsonPath("$.events").isEmpty());
        }

        @Test
        @DisplayName("Should use default radius and limit parameters")
        void searchEvents_DefaultParams_UsesDefaults() throws Exception {
            when(searchService.searchEvents("test", 40.7128, -74.0060, 5.0, 20))
                    .thenReturn(testResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isOk());

            verify(searchService).searchEvents("test", 40.7128, -74.0060, 5.0, 20);
        }

        @Test
        @DisplayName("Should accept custom radius and limit parameters")
        void searchEvents_CustomParams_UsesCustomValues() throws Exception {
            when(searchService.searchEvents("test", 40.7128, -74.0060, 10.0, 50))
                    .thenReturn(testResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("radiusMiles", "10.0")
                            .param("limit", "50"))
                    .andExpect(status().isOk());

            verify(searchService).searchEvents("test", 40.7128, -74.0060, 10.0, 50);
        }

        @Test
        @DisplayName("Should trim whitespace from query")
        void searchEvents_QueryWithWhitespace_TrimsQuery() throws Exception {
            when(searchService.searchEvents("test query", 40.7128, -74.0060, 5.0, 20))
                    .thenReturn(testResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "  test query  ")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isOk());

            verify(searchService).searchEvents("test query", 40.7128, -74.0060, 5.0, 20);
        }
    }

    @Nested
    @DisplayName("Request Validation - Query Parameter")
    class QueryValidationTests {

        @Test
        @DisplayName("Should return 400 for empty query")
        void searchEvents_EmptyQuery_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Search query cannot be empty"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for whitespace-only query")
        void searchEvents_WhitespaceQuery_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "   ")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Search query cannot be empty"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 when query parameter is missing")
        void searchEvents_MissingQuery_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isBadRequest());

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }
    }

    @Nested
    @DisplayName("Request Validation - Location Parameters")
    class LocationValidationTests {

        @Test
        @DisplayName("Should return 400 for invalid latitude - too high")
        void searchEvents_LatitudeTooHigh_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "91.0")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Latitude must be between -90 and 90 degrees"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for invalid latitude - too low")
        void searchEvents_LatitudeTooLow_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "-91.0")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Latitude must be between -90 and 90 degrees"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for invalid longitude - too high")
        void searchEvents_LongitudeTooHigh_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "181.0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Longitude must be between -180 and 180 degrees"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for invalid longitude - too low")
        void searchEvents_LongitudeTooLow_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-181.0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Longitude must be between -180 and 180 degrees"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should accept valid boundary latitude values")
        void searchEvents_BoundaryLatitudes_ReturnsOk() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
                    .thenReturn(testResponse);

            // Test maximum latitude
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "90.0")
                            .param("lon", "0.0"))
                    .andExpect(status().isOk());

            // Test minimum latitude
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "-90.0")
                            .param("lon", "0.0"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should accept valid boundary longitude values")
        void searchEvents_BoundaryLongitudes_ReturnsOk() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
                    .thenReturn(testResponse);

            // Test maximum longitude
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "0.0")
                            .param("lon", "180.0"))
                    .andExpect(status().isOk());

            // Test minimum longitude
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "0.0")
                            .param("lon", "-180.0"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should return 400 when location parameters are missing")
        void searchEvents_MissingLocationParams_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test"))
                    .andExpect(status().isBadRequest());

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }
    }

    @Nested
    @DisplayName("Request Validation - Radius Parameter")
    class RadiusValidationTests {

        @Test
        @DisplayName("Should return 400 for zero radius")
        void searchEvents_ZeroRadius_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("radiusMiles", "0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Radius must be greater than 0"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for negative radius")
        void searchEvents_NegativeRadius_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("radiusMiles", "-5.0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Radius must be greater than 0"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for radius exceeding maximum")
        void searchEvents_RadiusTooLarge_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("radiusMiles", "101"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Radius cannot exceed 100 miles"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should accept maximum allowed radius")
        void searchEvents_MaximumRadius_ReturnsOk() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), eq(100.0), anyInt()))
                    .thenReturn(testResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("radiusMiles", "100"))
                    .andExpect(status().isOk());

            verify(searchService).searchEvents("test", 40.7128, -74.0060, 100.0, 20);
        }
    }

    @Nested
    @DisplayName("Request Validation - Limit Parameter")
    class LimitValidationTests {

        @Test
        @DisplayName("Should return 400 for zero limit")
        void searchEvents_ZeroLimit_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("limit", "0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Limit must be greater than 0"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for negative limit")
        void searchEvents_NegativeLimit_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("limit", "-10"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Limit must be greater than 0"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should return 400 for limit exceeding maximum")
        void searchEvents_LimitTooLarge_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("limit", "101"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Limit cannot exceed 100"));

            verify(searchService, never()).searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt());
        }

        @Test
        @DisplayName("Should accept maximum allowed limit")
        void searchEvents_MaximumLimit_ReturnsOk() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), eq(100)))
                    .thenReturn(testResponse);

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("limit", "100"))
                    .andExpect(status().isOk());

            verify(searchService).searchEvents("test", 40.7128, -74.0060, 5.0, 100);
        }
    }

    @Nested
    @DisplayName("Error Handling")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should return 500 for service exceptions")
        void searchEvents_ServiceException_ReturnsInternalServerError() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
                    .thenThrow(new RuntimeException("Database connection failed"));

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").value("An error occurred while processing your search. Please try again."));
        }

        @Test
        @DisplayName("Should return 400 for IllegalArgumentException")
        void searchEvents_IllegalArgumentException_ReturnsBadRequest() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
                    .thenThrow(new IllegalArgumentException("Invalid search parameters"));

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Invalid request parameters: Invalid search parameters"));
        }

        @Test
        @DisplayName("Should handle service returning null gracefully")
        void searchEvents_ServiceReturnsNull_ReturnsEmptyResponse() throws Exception {
            when(searchService.searchEvents(anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
                    .thenReturn(null);

            mockMvc.perform(get("/search/events")
                            .param("query", "test")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.events").isArray())
                    .andExpect(jsonPath("$.events").isEmpty())
                    .andExpect(jsonPath("$.nextCursor").doesNotExist());
        }
    }

    @Nested
    @DisplayName("CORS Configuration")
    class CorsTests {

        @Test
        @DisplayName("Should handle CORS preflight requests")
        void searchEvents_CorsPreflight_ReturnsOk() throws Exception {
            mockMvc.perform(options("/search/events")
                            .header("Origin", "http://localhost:5173")
                            .header("Access-Control-Request-Method", "GET"))
                    .andExpect(status().isOk());
        }
    }
}