package com.example.demo;

import com.example.demo.Controllers.UserController;
import com.example.demo.Models.*;
import com.example.demo.Service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    private User testUser;
    private UserProfile testProfile;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testUser = new User(
                testUserId,
                "testuser",
                "test@example.com",
                "Test User",
                "This is my bio",
                "https://example.com/avatar.jpg",
                UserType.PERSONAL,
                40.7128,
                -74.0060,
                "New York",
                null,
                null,
                true,
                true,
                false,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        testProfile = new UserProfile(
                testUserId,
                "testuser",
                "Test User",
                "This is my bio",
                "https://example.com/avatar.jpg",
                UserType.PERSONAL,
                40.7128,
                -74.0060,
                "New York",
                null,
                null,
                5,
                100,
                50,
                false,
                OffsetDateTime.now()
        );
    }

    // ==================== USER REGISTRATION ====================

    @Nested
    @DisplayName("POST /users - User Registration")
    class CreateUserTests {

        @Test
        @DisplayName("Should create user with valid data")
        void createUser_ValidData_ReturnsCreated() throws Exception {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    "newuser@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            when(userService.createUser(any(CreateUserRequest.class))).thenReturn(testUser);

            mockMvc.perform(post("/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.username").value("testuser"))
                    .andExpect(jsonPath("$.email").value("test@example.com"));

            verify(userService).createUser(any(CreateUserRequest.class));
        }

        @Test
        @DisplayName("Should create business user")
        void createUser_BusinessAccount_ReturnsCreated() throws Exception {
            CreateUserRequest request = new CreateUserRequest(
                    "coolclub",
                    "info@coolclub.com",
                    "password123",
                    "Cool Club NYC",
                    "BUSINESS",
                    "Cool Club",
                    "Nightclub"
            );

            User businessUser = new User(
                    UUID.randomUUID(),
                    "coolclub",
                    "info@coolclub.com",
                    "Cool Club NYC",
                    "The hottest club in town",
                    null,
                    UserType.BUSINESS,
                    40.7128,
                    -74.0060,
                    "New York",
                    "Cool Club",
                    "Nightclub",
                    true,
                    true,
                    false,
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );

            when(userService.createUser(any(CreateUserRequest.class))).thenReturn(businessUser);

            mockMvc.perform(post("/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.userType").value("BUSINESS"))
                    .andExpect(jsonPath("$.businessName").value("Cool Club"));
        }

        @Test
        @DisplayName("Should return 400 for duplicate username")
        void createUser_DuplicateUsername_ReturnsBadRequest() throws Exception {
            CreateUserRequest request = new CreateUserRequest(
                    "existinguser",
                    "new@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            when(userService.createUser(any(CreateUserRequest.class)))
                    .thenThrow(new IllegalArgumentException("Username already taken"));

            mockMvc.perform(post("/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Username already taken"));
        }

        @Test
        @DisplayName("Should return 400 for short password")
        void createUser_ShortPassword_ReturnsBadRequest() throws Exception {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    "new@example.com",
                    "short",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            when(userService.createUser(any(CreateUserRequest.class)))
                    .thenThrow(new IllegalArgumentException("Password must be at least 8 characters"));

            mockMvc.perform(post("/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Password must be at least 8 characters"));
        }
    }

    // ==================== CURRENT USER (ME) ENDPOINTS ====================

    @Nested
    @DisplayName("GET /users/me - Get Current User")
    class GetCurrentUserTests {

        @Test
        @DisplayName("Should return current user when authenticated")
        void getCurrentUser_Authenticated_ReturnsUser() throws Exception {
            when(userService.getUserById(testUserId)).thenReturn(testUser);

            mockMvc.perform(get("/users/me")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(testUserId.toString()))
                    .andExpect(jsonPath("$.username").value("testuser"))
                    .andExpect(jsonPath("$.email").value("test@example.com"));
        }

        @Test
        @DisplayName("Should return 401 when not authenticated")
        void getCurrentUser_NotAuthenticated_ReturnsUnauthorized() throws Exception {
            mockMvc.perform(get("/users/me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Should return 404 when user not found")
        void getCurrentUser_UserNotFound_ReturnsNotFound() throws Exception {
            when(userService.getUserById(any(UUID.class))).thenReturn(null);

            mockMvc.perform(get("/users/me")
                            .header("X-User-Id", UUID.randomUUID().toString()))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should return 400 for invalid UUID")
        void getCurrentUser_InvalidUUID_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/users/me")
                            .header("X-User-Id", "not-a-uuid"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("PATCH /users/me - Update Current User")
    class UpdateCurrentUserTests {

        @Test
        @DisplayName("Should update user profile")
        void updateCurrentUser_ValidData_ReturnsUpdatedUser() throws Exception {
            UpdateUserRequest request = new UpdateUserRequest(
                    "Updated Name",
                    "Updated bio",
                    "https://example.com/new-avatar.jpg",
                    null, null, null, null, null, null, null
            );

            User updatedUser = new User(
                    testUserId,
                    "testuser",
                    "test@example.com",
                    "Updated Name",
                    "Updated bio",
                    "https://example.com/new-avatar.jpg",
                    UserType.PERSONAL,
                    40.7128,
                    -74.0060,
                    "New York",
                    null,
                    null,
                    true,
                    true,
                    false,
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );

            when(userService.updateUser(eq(testUserId), any(UpdateUserRequest.class)))
                    .thenReturn(updatedUser);

            mockMvc.perform(patch("/users/me")
                            .header("X-User-Id", testUserId.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.displayName").value("Updated Name"))
                    .andExpect(jsonPath("$.bio").value("Updated bio"));
        }

        @Test
        @DisplayName("Should update privacy settings")
        void updateCurrentUser_PrivacySettings_ReturnsUpdatedUser() throws Exception {
            UpdateUserRequest request = new UpdateUserRequest(
                    null, null, null, null, null, null, null, null,
                    false,  // locationVisible
                    false   // profilePublic
            );

            User updatedUser = new User(
                    testUserId,
                    "testuser",
                    "test@example.com",
                    "Test User",
                    "This is my bio",
                    null,
                    UserType.PERSONAL,
                    40.7128,
                    -74.0060,
                    "New York",
                    null,
                    null,
                    false,  // locationVisible
                    false,  // profilePublic
                    false,
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );

            when(userService.updateUser(eq(testUserId), any(UpdateUserRequest.class)))
                    .thenReturn(updatedUser);

            mockMvc.perform(patch("/users/me")
                            .header("X-User-Id", testUserId.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.locationVisible").value(false))
                    .andExpect(jsonPath("$.profilePublic").value(false));
        }

        @Test
        @DisplayName("Should return 401 when not authenticated")
        void updateCurrentUser_NotAuthenticated_ReturnsUnauthorized() throws Exception {
            UpdateUserRequest request = new UpdateUserRequest(
                    "New Name", null, null, null, null, null, null, null, null, null
            );

            mockMvc.perform(patch("/users/me")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("PUT /users/me/location - Update Location")
    class UpdateLocationTests {

        @Test
        @DisplayName("Should update user location")
        void updateLocation_ValidCoordinates_ReturnsSuccess() throws Exception {
            when(userService.updateLocation(testUserId, 40.7589, -73.9851)).thenReturn(true);

            mockMvc.perform(put("/users/me/location")
                            .header("X-User-Id", testUserId.toString())
                            .param("lat", "40.7589")
                            .param("lon", "-73.9851"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Location updated"));
        }

        @Test
        @DisplayName("Should return 404 when user not found")
        void updateLocation_UserNotFound_ReturnsNotFound() throws Exception {
            when(userService.updateLocation(any(UUID.class), anyDouble(), anyDouble()))
                    .thenReturn(false);

            mockMvc.perform(put("/users/me/location")
                            .header("X-User-Id", UUID.randomUUID().toString())
                            .param("lat", "40.7589")
                            .param("lon", "-73.9851"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should return 401 when not authenticated")
        void updateLocation_NotAuthenticated_ReturnsUnauthorized() throws Exception {
            mockMvc.perform(put("/users/me/location")
                            .param("lat", "40.7589")
                            .param("lon", "-73.9851"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ==================== PUBLIC PROFILE ENDPOINTS ====================

    @Nested
    @DisplayName("GET /users/{username} - Get Public Profile")
    class GetPublicProfileTests {

        @Test
        @DisplayName("Should return public profile by username")
        void getProfile_ExistingUser_ReturnsProfile() throws Exception {
            when(userService.getPublicProfile("testuser")).thenReturn(testProfile);

            mockMvc.perform(get("/users/testuser"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.username").value("testuser"))
                    .andExpect(jsonPath("$.displayName").value("Test User"))
                    .andExpect(jsonPath("$.eventCount").value(5))
                    .andExpect(jsonPath("$.followerCount").value(100))
                    .andExpect(jsonPath("$.followingCount").value(50))
                    // Email should NOT be in public profile
                    .andExpect(jsonPath("$.email").doesNotExist());
        }

        @Test
        @DisplayName("Should return 404 for non-existent user")
        void getProfile_NonExistentUser_ReturnsNotFound() throws Exception {
            when(userService.getPublicProfile("unknownuser")).thenReturn(null);

            mockMvc.perform(get("/users/unknownuser"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should return 404 for private profile")
        void getProfile_PrivateProfile_ReturnsNotFound() throws Exception {
            when(userService.getPublicProfile("privateuser")).thenReturn(null);

            mockMvc.perform(get("/users/privateuser"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET /users/id/{userId} - Get Profile by ID")
    class GetProfileByIdTests {

        @Test
        @DisplayName("Should return profile by UUID")
        void getProfileById_ExistingUser_ReturnsProfile() throws Exception {
            when(userService.getPublicProfileById(testUserId)).thenReturn(testProfile);

            mockMvc.perform(get("/users/id/" + testUserId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(testUserId.toString()))
                    .andExpect(jsonPath("$.username").value("testuser"));
        }

        @Test
        @DisplayName("Should return 400 for invalid UUID")
        void getProfileById_InvalidUUID_ReturnsBadRequest() throws Exception {
            mockMvc.perform(get("/users/id/not-a-valid-uuid"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== DISCOVERY ENDPOINTS ====================

    @Nested
    @DisplayName("GET /users/nearby - Find Nearby Users")
    class NearbyUsersTests {

        @Test
        @DisplayName("Should return users near location")
        void getNearbyUsers_ValidLocation_ReturnsUsers() throws Exception {
            List<UserProfile> nearbyUsers = List.of(testProfile);
            when(userService.getUsersNearby(40.7128, -74.0060, 5.0, 50))
                    .thenReturn(nearbyUsers);

            mockMvc.perform(get("/users/nearby")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("radiusMiles", "5.0")
                            .param("limit", "50"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].username").value("testuser"));
        }

        @Test
        @DisplayName("Should use default radius and limit")
        void getNearbyUsers_DefaultParams_ReturnsUsers() throws Exception {
            when(userService.getUsersNearby(40.7128, -74.0060, 5.0, 50))
                    .thenReturn(List.of());

            mockMvc.perform(get("/users/nearby")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060"))
                    .andExpect(status().isOk());

            verify(userService).getUsersNearby(40.7128, -74.0060, 5.0, 50);
        }
    }

    @Nested
    @DisplayName("GET /users/businesses/nearby - Find Nearby Businesses")
    class NearbyBusinessesTests {

        @Test
        @DisplayName("Should return businesses near location")
        void getNearbyBusinesses_ValidLocation_ReturnsBusinesses() throws Exception {
            UserProfile businessProfile = new UserProfile(
                    UUID.randomUUID(),
                    "coolclub",
                    "Cool Club NYC",
                    "The hottest club",
                    null,
                    UserType.BUSINESS,
                    40.7128,
                    -74.0060,
                    "New York",
                    "Cool Club",
                    "Nightclub",
                    20,
                    5000,
                    10,
                    true,
                    OffsetDateTime.now()
            );

            when(userService.getBusinessesNearby(40.7128, -74.0060, 5.0, "Nightclub", 50))
                    .thenReturn(List.of(businessProfile));

            mockMvc.perform(get("/users/businesses/nearby")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("category", "Nightclub"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].userType").value("BUSINESS"))
                    .andExpect(jsonPath("$[0].businessName").value("Cool Club"));
        }

        @Test
        @DisplayName("Should filter by category")
        void getNearbyBusinesses_WithCategory_FiltersResults() throws Exception {
            when(userService.getBusinessesNearby(anyDouble(), anyDouble(), anyDouble(), eq("Restaurant"), anyInt()))
                    .thenReturn(List.of());

            mockMvc.perform(get("/users/businesses/nearby")
                            .param("lat", "40.7128")
                            .param("lon", "-74.0060")
                            .param("category", "Restaurant"))
                    .andExpect(status().isOk());

            verify(userService).getBusinessesNearby(40.7128, -74.0060, 5.0, "Restaurant", 50);
        }
    }

    @Nested
    @DisplayName("GET /users/search - Search Users")
    class SearchUsersTests {

        @Test
        @DisplayName("Should search users by query")
        void searchUsers_ValidQuery_ReturnsMatches() throws Exception {
            when(userService.searchUsers("test", 20)).thenReturn(List.of(testProfile));

            mockMvc.perform(get("/users/search")
                            .param("q", "test"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].username").value("testuser"));
        }

        @Test
        @DisplayName("Should return empty for no matches")
        void searchUsers_NoMatches_ReturnsEmptyList() throws Exception {
            when(userService.searchUsers("nonexistent", 20)).thenReturn(List.of());

            mockMvc.perform(get("/users/search")
                            .param("q", "nonexistent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }

    // ==================== FOLLOW SYSTEM ====================

    @Nested
    @DisplayName("POST /users/{username}/follow - Follow User")
    class FollowUserTests {

        @Test
        @DisplayName("Should follow user successfully")
        void followUser_ValidUser_ReturnsSuccess() throws Exception {
            User targetUser = new User(
                    UUID.randomUUID(),
                    "targetuser",
                    "target@example.com",
                    "Target User",
                    UserType.PERSONAL
            );

            when(userService.getUserByUsername("targetuser")).thenReturn(targetUser);
            when(userService.followUser(eq(testUserId), any(UUID.class))).thenReturn(true);

            mockMvc.perform(post("/users/targetuser/follow")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Now following targetuser"));
        }

        @Test
        @DisplayName("Should return 404 for non-existent user")
        void followUser_NonExistentUser_ReturnsNotFound() throws Exception {
            when(userService.getUserByUsername("unknownuser")).thenReturn(null);

            mockMvc.perform(post("/users/unknownuser/follow")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should return 400 when trying to follow self")
        void followUser_SelfFollow_ReturnsBadRequest() throws Exception {
            when(userService.getUserByUsername("testuser")).thenReturn(testUser);
            when(userService.followUser(testUserId, testUserId)).thenReturn(false);

            mockMvc.perform(post("/users/testuser/follow")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 401 when not authenticated")
        void followUser_NotAuthenticated_ReturnsUnauthorized() throws Exception {
            mockMvc.perform(post("/users/targetuser/follow"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("DELETE /users/{username}/follow - Unfollow User")
    class UnfollowUserTests {

        @Test
        @DisplayName("Should unfollow user successfully")
        void unfollowUser_Following_ReturnsSuccess() throws Exception {
            User targetUser = new User(
                    UUID.randomUUID(),
                    "targetuser",
                    "target@example.com",
                    "Target User",
                    UserType.PERSONAL
            );

            when(userService.getUserByUsername("targetuser")).thenReturn(targetUser);
            when(userService.unfollowUser(eq(testUserId), any(UUID.class))).thenReturn(true);

            mockMvc.perform(delete("/users/targetuser/follow")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Unfollowed targetuser"));
        }

        @Test
        @DisplayName("Should return OK even if not following")
        void unfollowUser_NotFollowing_ReturnsOk() throws Exception {
            User targetUser = new User(
                    UUID.randomUUID(),
                    "targetuser",
                    "target@example.com",
                    "Target User",
                    UserType.PERSONAL
            );

            when(userService.getUserByUsername("targetuser")).thenReturn(targetUser);
            when(userService.unfollowUser(eq(testUserId), any(UUID.class))).thenReturn(false);

            mockMvc.perform(delete("/users/targetuser/follow")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Was not following targetuser"));
        }
    }

    @Nested
    @DisplayName("GET /users/{username}/followers - Get Followers")
    class GetFollowersTests {

        @Test
        @DisplayName("Should return paginated followers")
        void getFollowers_ExistingUser_ReturnsFollowers() throws Exception {
            UsersResponse response = new UsersResponse(List.of(testProfile), null);

            when(userService.getUserByUsername("testuser")).thenReturn(testUser);
            when(userService.getFollowers(testUserId, null, 20)).thenReturn(response);

            mockMvc.perform(get("/users/testuser/followers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.users").isArray())
                    .andExpect(jsonPath("$.users[0].username").value("testuser"))
                    .andExpect(jsonPath("$.nextCursor").doesNotExist());
        }

        @Test
        @DisplayName("Should support cursor pagination")
        void getFollowers_WithCursor_ReturnsPaginatedResults() throws Exception {
            String cursor = UUID.randomUUID().toString();
            UsersResponse response = new UsersResponse(List.of(testProfile), "next-cursor-id");

            when(userService.getUserByUsername("testuser")).thenReturn(testUser);
            when(userService.getFollowers(testUserId, cursor, 10)).thenReturn(response);

            mockMvc.perform(get("/users/testuser/followers")
                            .param("cursor", cursor)
                            .param("limit", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nextCursor").value("next-cursor-id"));
        }

        @Test
        @DisplayName("Should return 404 for non-existent user")
        void getFollowers_NonExistentUser_ReturnsNotFound() throws Exception {
            when(userService.getUserByUsername("unknownuser")).thenReturn(null);

            mockMvc.perform(get("/users/unknownuser/followers"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET /users/{username}/following - Get Following")
    class GetFollowingTests {

        @Test
        @DisplayName("Should return users being followed")
        void getFollowing_ExistingUser_ReturnsFollowing() throws Exception {
            UsersResponse response = new UsersResponse(List.of(testProfile), null);

            when(userService.getUserByUsername("testuser")).thenReturn(testUser);
            when(userService.getFollowing(eq(testUserId), isNull(), eq(20))).thenReturn(response);

            mockMvc.perform(get("/users/testuser/following")
                            .param("limit", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.users").isArray());
        }
    }

    @Nested
    @DisplayName("GET /users/{username}/is-following - Check If Following (authenticated)")
    class IsFollowingTests {

        @Test
        @DisplayName("Should return true when following")
        void isFollowing_Following_ReturnsTrue() throws Exception {
            User targetUser = new User(
                    UUID.randomUUID(),
                    "targetuser",
                    "target@example.com",
                    "Target User",
                    UserType.PERSONAL
            );

            when(userService.getUserByUsername("targetuser")).thenReturn(targetUser);
            when(userService.isFollowing(eq(testUserId), any(UUID.class))).thenReturn(true);

            mockMvc.perform(get("/users/targetuser/is-following")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.following").value(true));
        }

        @Test
        @DisplayName("Should return false when not following")
        void isFollowing_NotFollowing_ReturnsFalse() throws Exception {
            User targetUser = new User(
                    UUID.randomUUID(),
                    "targetuser",
                    "target@example.com",
                    "Target User",
                    UserType.PERSONAL
            );

            when(userService.getUserByUsername("targetuser")).thenReturn(targetUser);
            when(userService.isFollowing(eq(testUserId), any(UUID.class))).thenReturn(false);

            mockMvc.perform(get("/users/targetuser/is-following")
                            .header("X-User-Id", testUserId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.following").value(false));
        }
    }
}