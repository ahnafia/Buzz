package com.example.demo;

import com.example.demo.Models.*;
import com.example.demo.Service.LandmarkService;
import com.example.demo.Service.FlagService;
import com.example.demo.Service.UserService;
import com.example.demo.Repositories.LandmarkRepository;
import com.example.demo.Repositories.FlagRepository;
import com.example.demo.Repositories.FlagLikeRepository;
import com.example.demo.Repositories.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive Test Suite for Profile Features
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Profile Features Test Suite")
public class ProfileFeaturesTest {

    @Mock
    private LandmarkRepository landmarkRepository;
    
    @Mock
    private FlagRepository flagRepository;
    
    @Mock
    private FlagLikeRepository flagLikeRepository;
    
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LandmarkService landmarkService;
    
    @InjectMocks
    private FlagService flagService;
    
    @InjectMocks
    private UserService userService;

    private UUID testUserId;
    private UUID testLandmarkId;
    private UUID testFlagId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testLandmarkId = UUID.randomUUID();
        testFlagId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should create landmark with valid data")
    void createLandmark_ValidData_ReturnsLandmark() {
        // Given
        CreateLandmarkRequest request = new CreateLandmarkRequest(
                "Central Park",
                "A beautiful park",
                40.7829,
                -73.9654,
                "New York",
                "Central Park, New York, NY",
                "park"
        );
        
        Landmark expectedLandmark = new Landmark(
                testLandmarkId,
                testUserId,
                "Central Park",
                "A beautiful park",
                40.7829,
                -73.9654,
                "New York",
                "Central Park, New York, NY",
                "park",
                0,
                OffsetDateTime.now(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        when(landmarkRepository.createLandmark(
                eq(testUserId),
                eq("Central Park"),
                eq("A beautiful park"),
                eq(40.7829),
                eq(-73.9654),
                eq("New York"),
                eq("Central Park, New York, NY"),
                eq("park")
        )).thenReturn(testLandmarkId);
        when(landmarkRepository.fetchLandmarkById(testLandmarkId)).thenReturn(expectedLandmark);

        // When
        Landmark result = landmarkService.createLandmark(request, testUserId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.name()).isEqualTo("Central Park");
        assertThat(result.userId()).isEqualTo(testUserId);
        assertThat(result.category()).isEqualTo("park");
    }

    @Test
    @DisplayName("Should create flag with valid data")
    void createFlag_ValidData_ReturnsFlag() {
        // Given
        CreateFlagRequest request = new CreateFlagRequest(
                "Amazing concert",
                "The Beatles reunion",
                40.7128,
                -74.0060,
                "New York",
                "Madison Square Garden, New York, NY",
                "event",
                "https://example.com/concert.jpg",
                new String[]{}, // imagePaths - empty array for now
                "#FF9B56", // color
                true
        );
        
        Flag expectedFlag = new Flag(
                testFlagId,
                testUserId,
                "Amazing concert",
                "The Beatles reunion",
                40.7128,
                -74.0060,
                "New York",
                "Madison Square Garden, New York, NY",
                "event",
                "https://example.com/concert.jpg",
                new String[]{}, // imagePaths - empty array for now
                "#FF9B56", // color
                true,
                OffsetDateTime.now().plusDays(7),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        when(flagRepository.createFlag(
                eq(testUserId),
                eq("Amazing concert"),
                eq("The Beatles reunion"),
                eq(40.7128),
                eq(-74.0060),
                eq("New York"),
                eq("Madison Square Garden, New York, NY"),
                eq("event"),
                eq("https://example.com/concert.jpg"),
                eq(new String[]{}), // imagePaths
                eq("#FF9B56"), // color
                eq(true),
                any(OffsetDateTime.class)
        )).thenReturn(testFlagId);
        when(flagRepository.fetchFlagById(testFlagId)).thenReturn(expectedFlag);

        // When
        Flag result = flagService.createFlag(request, testUserId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.title()).isEqualTo("Amazing concert");
        assertThat(result.userId()).isEqualTo(testUserId);
        assertThat(result.isPublic()).isTrue();
    }

    @Test
    @DisplayName("Should like flag successfully")
    void likeFlag_ValidFlag_LikesSuccessfully() {
        // Given
        UUID likeUserId = UUID.randomUUID();
        when(flagLikeRepository.likeFlag(testFlagId, likeUserId))
                .thenReturn(UUID.randomUUID());

        // When
        boolean result = flagService.likeFlag(testFlagId, likeUserId);

        // Then
        assertThat(result).isTrue();
        verify(flagLikeRepository).likeFlag(testFlagId, likeUserId);
    }

    @Test
    @DisplayName("Should get landmark count for user")
    void countUserLandmarks_ValidUser_ReturnsCount() {
        // Given
        when(landmarkRepository.countUserLandmarks(testUserId)).thenReturn(5);

        // When
        int count = landmarkService.countUserLandmarks(testUserId);

        // Then
        assertThat(count).isEqualTo(5);
    }

    @Test
    @DisplayName("Should get flag count for user")
    void countUserFlags_ValidUser_ReturnsCount() {
        // Given
        when(flagRepository.countUserFlags(testUserId)).thenReturn(12);

        // When
        int count = flagService.countUserFlags(testUserId);

        // Then
        assertThat(count).isEqualTo(12);
    }
}