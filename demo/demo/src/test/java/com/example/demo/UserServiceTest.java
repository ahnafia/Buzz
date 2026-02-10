package com.example.demo;

import com.example.demo.Models.*;
import com.example.demo.Repositories.UserRepository;
import com.example.demo.Service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;
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
                "123 Main St, New York, NY",
                null,
                null,
                true,
                true,
                false,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );
    }

    // ==================== USER CREATION ====================

    @Nested
    @DisplayName("createUser")
    class CreateUserTests {

        @Test
        @DisplayName("Should create user with valid data")
        void createUser_ValidData_ReturnsUser() {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    "new@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            when(userRepository.usernameExists("newuser")).thenReturn(false);
            when(userRepository.emailExists("new@example.com")).thenReturn(false);
            when(userRepository.createUser(
                    eq("newuser"),
                    eq("new@example.com"),
                    anyString(),
                    eq("New User"),
                    eq(UserType.PERSONAL),
                    isNull(),
                    isNull()
            )).thenReturn(testUserId);
            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);

            User result = userService.createUser(request);

            assertThat(result).isNotNull();
            assertThat(result.username()).isEqualTo("testuser");
            verify(userRepository).createUser(anyString(), anyString(), anyString(), anyString(), any(), any(), any());
        }

        @Test
        @DisplayName("Should create business account")
        void createUser_BusinessAccount_SetsCorrectType() {
            CreateUserRequest request = new CreateUserRequest(
                    "coolclub",
                    "info@coolclub.com",
                    "password123",
                    "Cool Club",
                    "BUSINESS",
                    "Cool Club NYC",
                    "Nightclub"
            );

            when(userRepository.usernameExists("coolclub")).thenReturn(false);
            when(userRepository.emailExists("info@coolclub.com")).thenReturn(false);
            when(userRepository.createUser(
                    eq("coolclub"),
                    eq("info@coolclub.com"),
                    anyString(),
                    eq("Cool Club"),
                    eq(UserType.BUSINESS),
                    eq("Cool Club NYC"),
                    eq("Nightclub")
            )).thenReturn(testUserId);
            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);

            userService.createUser(request);

            verify(userRepository).createUser(
                    eq("coolclub"),
                    eq("info@coolclub.com"),
                    anyString(),
                    eq("Cool Club"),
                    eq(UserType.BUSINESS),
                    eq("Cool Club NYC"),
                    eq("Nightclub")
            );
        }

        @Test
        @DisplayName("Should throw exception for missing username")
        void createUser_MissingUsername_ThrowsException() {
            CreateUserRequest request = new CreateUserRequest(
                    null,
                    "new@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Username is required");
        }

        @Test
        @DisplayName("Should throw exception for blank username")
        void createUser_BlankUsername_ThrowsException() {
            CreateUserRequest request = new CreateUserRequest(
                    "   ",
                    "new@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Username is required");
        }

        @Test
        @DisplayName("Should throw exception for missing email")
        void createUser_MissingEmail_ThrowsException() {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    null,
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Email is required");
        }

        @Test
        @DisplayName("Should throw exception for short password")
        void createUser_ShortPassword_ThrowsException() {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    "new@example.com",
                    "short",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Password must be at least 8 characters");
        }

        @Test
        @DisplayName("Should throw exception for duplicate username")
        void createUser_DuplicateUsername_ThrowsException() {
            CreateUserRequest request = new CreateUserRequest(
                    "existinguser",
                    "new@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            when(userRepository.usernameExists("existinguser")).thenReturn(true);

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Username already taken");
        }

        @Test
        @DisplayName("Should throw exception for duplicate email")
        void createUser_DuplicateEmail_ThrowsException() {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    "existing@example.com",
                    "password123",
                    "New User",
                    "PERSONAL",
                    null,
                    null
            );

            when(userRepository.usernameExists("newuser")).thenReturn(false);
            when(userRepository.emailExists("existing@example.com")).thenReturn(true);

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Email already registered");
        }

        @Test
        @DisplayName("Should use username as display name when not provided")
        void createUser_NoDisplayName_UsesUsername() {
            CreateUserRequest request = new CreateUserRequest(
                    "newuser",
                    "new@example.com",
                    "password123",
                    null,  // no display name
                    "PERSONAL",
                    null,
                    null
            );

            when(userRepository.usernameExists("newuser")).thenReturn(false);
            when(userRepository.emailExists("new@example.com")).thenReturn(false);
            when(userRepository.createUser(
                    eq("newuser"),
                    eq("new@example.com"),
                    anyString(),
                    eq("newuser"),  // should use username
                    eq(UserType.PERSONAL),
                    isNull(),
                    isNull()
            )).thenReturn(testUserId);
            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);

            userService.createUser(request);

            verify(userRepository).createUser(
                    anyString(),
                    anyString(),
                    anyString(),
                    eq("newuser"),
                    any(),
                    any(),
                    any()
            );
        }
    }

    // ==================== GET USER ====================

    @Nested
    @DisplayName("getUserById")
    class GetUserByIdTests {

        @Test
        @DisplayName("Should return user when exists")
        void getUserById_ExistingUser_ReturnsUser() {
            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);

            User result = userService.getUserById(testUserId);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(testUserId);
        }

        @Test
        @DisplayName("Should return null when user not found")
        void getUserById_NonExistentUser_ReturnsNull() {
            when(userRepository.fetchUserById(any(UUID.class))).thenReturn(null);

            User result = userService.getUserById(UUID.randomUUID());

            assertThat(result).isNull();
        }
    }

    // ==================== PUBLIC PROFILE ====================

    @Nested
    @DisplayName("getPublicProfile")
    class GetPublicProfileTests {

        @Test
        @DisplayName("Should return profile for public user")
        void getPublicProfile_PublicUser_ReturnsProfile() {
            when(userRepository.fetchUserByUsername("testuser")).thenReturn(testUser);
            when(userRepository.countEvents(testUserId)).thenReturn(5);
            when(userRepository.countFollowers(testUserId)).thenReturn(100);
            when(userRepository.countFollowing(testUserId)).thenReturn(50);

            UserProfile result = userService.getPublicProfile("testuser");

            assertThat(result).isNotNull();
            assertThat(result.username()).isEqualTo("testuser");
            assertThat(result.eventCount()).isEqualTo(5);
            assertThat(result.followerCount()).isEqualTo(100);
            assertThat(result.followingCount()).isEqualTo(50);
        }

        @Test
        @DisplayName("Should return null for non-existent user")
        void getPublicProfile_NonExistentUser_ReturnsNull() {
            when(userRepository.fetchUserByUsername("unknown")).thenReturn(null);

            UserProfile result = userService.getPublicProfile("unknown");

            assertThat(result).isNull();
        }

        @Test
        @DisplayName("Should return null for private profile")
        void getPublicProfile_PrivateUser_ReturnsNull() {
            User privateUser = new User(
                    testUserId,
                    "privateuser",
                    "private@example.com",
                    "Private User",
                    null,
                    null,
                    UserType.PERSONAL,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    true,
                    false,  // profilePublic = false
                    false,
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );

            when(userRepository.fetchUserByUsername("privateuser")).thenReturn(privateUser);

            UserProfile result = userService.getPublicProfile("privateuser");

            assertThat(result).isNull();
        }

        @Test
        @DisplayName("Should hide location for users with location_visible=false")
        void getPublicProfile_LocationHidden_HidesLocation() {
            User hiddenLocationUser = new User(
                    testUserId,
                    "hiddenuser",
                    "hidden@example.com",
                    "Hidden User",
                    null,
                    null,
                    UserType.PERSONAL,
                    40.7128,
                    -74.0060,
                    "New York",
                    "123 Hidden St, New York, NY",
                    null,
                    null,
                    false,  // locationVisible = false
                    true,
                    false,
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );

            when(userRepository.fetchUserByUsername("hiddenuser")).thenReturn(hiddenLocationUser);
            when(userRepository.countEvents(testUserId)).thenReturn(0);
            when(userRepository.countFollowers(testUserId)).thenReturn(0);
            when(userRepository.countFollowing(testUserId)).thenReturn(0);

            UserProfile result = userService.getPublicProfile("hiddenuser");

            assertThat(result).isNotNull();
            assertThat(result.lat()).isNull();
            assertThat(result.lon()).isNull();
            assertThat(result.city()).isEqualTo("New York");  // city still visible
        }
    }

    // ==================== UPDATE USER ====================

    @Nested
    @DisplayName("updateUser")
    class UpdateUserTests {

        @Test
        @DisplayName("Should update user successfully")
        void updateUser_ValidRequest_ReturnsUpdatedUser() {
            UpdateUserRequest request = new UpdateUserRequest(
                    "New Name",
                    "New bio",
                    null, null, null, null, null, null, null, null, null
            );

            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);
            when(userRepository.updateUser(
                    eq(testUserId),
                    eq("New Name"),
                    eq("New bio"),
                    isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
            )).thenReturn(true);

            User result = userService.updateUser(testUserId, request);

            assertThat(result).isNotNull();
            verify(userRepository).updateUser(
                    eq(testUserId),
                    eq("New Name"),
                    eq("New bio"),
                    isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
            );
        }

        @Test
        @DisplayName("Should return null for non-existent user")
        void updateUser_NonExistentUser_ReturnsNull() {
            when(userRepository.fetchUserById(any(UUID.class))).thenReturn(null);

            UpdateUserRequest request = new UpdateUserRequest(
                    "New Name", null, null, null, null, null, null, null, null, null, null
            );

            User result = userService.updateUser(UUID.randomUUID(), request);

            assertThat(result).isNull();
            verify(userRepository, never()).updateUser(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        }
    }

    // ==================== DISCOVERY ====================

    @Nested
    @DisplayName("getUsersNearby")
    class GetUsersNearbyTests {

        @Test
        @DisplayName("Should find users within radius")
        void getUsersNearby_ValidParams_ReturnsUsers() {
            when(userRepository.fetchUsersNearby(-74.0060, 40.7128, 8046, 50))
                    .thenReturn(List.of(testUser));
            when(userRepository.countEvents(testUserId)).thenReturn(5);
            when(userRepository.countFollowers(testUserId)).thenReturn(100);
            when(userRepository.countFollowing(testUserId)).thenReturn(50);

            List<UserProfile> results = userService.getUsersNearby(40.7128, -74.0060, 5.0, 50);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).username()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("Should clamp radius to max")
        void getUsersNearby_ExcessiveRadius_ClampsToMax() {
            when(userRepository.fetchUsersNearby(anyDouble(), anyDouble(), eq(40000), anyInt()))
                    .thenReturn(List.of());

            userService.getUsersNearby(40.7128, -74.0060, 100.0, 50);  // 100 miles = way over max

            verify(userRepository).fetchUsersNearby(anyDouble(), anyDouble(), eq(40000), anyInt());
        }

        @Test
        @DisplayName("Should clamp limit to max")
        void getUsersNearby_ExcessiveLimit_ClampsToMax() {
            when(userRepository.fetchUsersNearby(anyDouble(), anyDouble(), anyInt(), eq(100)))
                    .thenReturn(List.of());

            userService.getUsersNearby(40.7128, -74.0060, 5.0, 500);  // over max

            verify(userRepository).fetchUsersNearby(anyDouble(), anyDouble(), anyInt(), eq(100));
        }
    }

    @Nested
    @DisplayName("searchUsers")
    class SearchUsersTests {

        @Test
        @DisplayName("Should search users by query")
        void searchUsers_ValidQuery_ReturnsMatches() {
            when(userRepository.searchUsers("test", 20)).thenReturn(List.of(testUser));
            when(userRepository.countEvents(testUserId)).thenReturn(5);
            when(userRepository.countFollowers(testUserId)).thenReturn(100);
            when(userRepository.countFollowing(testUserId)).thenReturn(50);

            List<UserProfile> results = userService.searchUsers("test", 20);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).username()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("Should return empty list for blank query")
        void searchUsers_BlankQuery_ReturnsEmpty() {
            List<UserProfile> results = userService.searchUsers("   ", 20);

            assertThat(results).isEmpty();
            verify(userRepository, never()).searchUsers(anyString(), anyInt());
        }

        @Test
        @DisplayName("Should return empty list for null query")
        void searchUsers_NullQuery_ReturnsEmpty() {
            List<UserProfile> results = userService.searchUsers(null, 20);

            assertThat(results).isEmpty();
            verify(userRepository, never()).searchUsers(anyString(), anyInt());
        }
    }

    // ==================== FOLLOW SYSTEM ====================

    @Nested
    @DisplayName("followUser")
    class FollowUserTests {

        @Test
        @DisplayName("Should follow user successfully")
        void followUser_ValidUsers_ReturnsTrue() {
            UUID targetId = UUID.randomUUID();
            User targetUser = new User(targetId, "target", "target@test.com", "Target", UserType.PERSONAL);

            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);
            when(userRepository.fetchUserById(targetId)).thenReturn(targetUser);
            when(userRepository.followUser(testUserId, targetId)).thenReturn(true);

            boolean result = userService.followUser(testUserId, targetId);

            assertThat(result).isTrue();
            verify(userRepository).followUser(testUserId, targetId);
        }

        @Test
        @DisplayName("Should return false for non-existent follower")
        void followUser_NonExistentFollower_ReturnsFalse() {
            UUID targetId = UUID.randomUUID();

            when(userRepository.fetchUserById(testUserId)).thenReturn(null);

            boolean result = userService.followUser(testUserId, targetId);

            assertThat(result).isFalse();
            verify(userRepository, never()).followUser(any(), any());
        }

        @Test
        @DisplayName("Should return false for non-existent target")
        void followUser_NonExistentTarget_ReturnsFalse() {
            UUID targetId = UUID.randomUUID();

            when(userRepository.fetchUserById(testUserId)).thenReturn(testUser);
            when(userRepository.fetchUserById(targetId)).thenReturn(null);

            boolean result = userService.followUser(testUserId, targetId);

            assertThat(result).isFalse();
            verify(userRepository, never()).followUser(any(), any());
        }
    }

    @Nested
    @DisplayName("unfollowUser")
    class UnfollowUserTests {

        @Test
        @DisplayName("Should unfollow user successfully")
        void unfollowUser_Following_ReturnsTrue() {
            UUID targetId = UUID.randomUUID();

            when(userRepository.unfollowUser(testUserId, targetId)).thenReturn(true);

            boolean result = userService.unfollowUser(testUserId, targetId);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when not following")
        void unfollowUser_NotFollowing_ReturnsFalse() {
            UUID targetId = UUID.randomUUID();

            when(userRepository.unfollowUser(testUserId, targetId)).thenReturn(false);

            boolean result = userService.unfollowUser(testUserId, targetId);

            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("getFollowers / getFollowing")
    class FollowListTests {

        @Test
        @DisplayName("Should return paginated followers")
        void getFollowers_WithResults_ReturnsPaginatedList() {
            when(userRepository.fetchFollowers(testUserId, null, 21))
                    .thenReturn(List.of(testUser));
            when(userRepository.countEvents(testUserId)).thenReturn(5);
            when(userRepository.countFollowers(testUserId)).thenReturn(100);
            when(userRepository.countFollowing(testUserId)).thenReturn(50);

            UsersResponse result = userService.getFollowers(testUserId, null, 20);

            assertThat(result.users()).hasSize(1);
            assertThat(result.nextCursor()).isNull();
        }

        @Test
        @DisplayName("Should include cursor when more results exist")
        void getFollowers_MoreResults_IncludesCursor() {
            User user1 = testUser;
            User user2 = new User(UUID.randomUUID(), "user2", "u2@test.com", "User 2", UserType.PERSONAL);
            User user3 = new User(UUID.randomUUID(), "user3", "u3@test.com", "User 3", UserType.PERSONAL);

            when(userRepository.fetchFollowers(testUserId, null, 3))
                    .thenReturn(List.of(user1, user2, user3));  // 3 results for limit 2
            when(userRepository.countEvents(any(UUID.class))).thenReturn(0);
            when(userRepository.countFollowers(any(UUID.class))).thenReturn(0);
            when(userRepository.countFollowing(any(UUID.class))).thenReturn(0);

            UsersResponse result = userService.getFollowers(testUserId, null, 2);

            assertThat(result.users()).hasSize(2);
            assertThat(result.nextCursor()).isNotNull();
        }
    }

    // ==================== PASSWORD VERIFICATION ====================

    @Nested
    @DisplayName("verifyPassword")
    class VerifyPasswordTests {

        @Test
        @DisplayName("Should return true for correct password")
        void verifyPassword_CorrectPassword_ReturnsTrue() {
            // Compute the hash the same way UserService does
            String password = "password123";
            String expectedHash;
            try {
                java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                byte[] hash = md.digest(password.getBytes());
                expectedHash = java.util.Base64.getEncoder().encodeToString(hash);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }

            when(userRepository.fetchPasswordHash(testUserId)).thenReturn(expectedHash);

            boolean result = userService.verifyPassword(testUserId, "password123");

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false for incorrect password")
        void verifyPassword_IncorrectPassword_ReturnsFalse() {
            String storedHash = "pmWkWSBCL51Bfkhn79xPuKBKHz//H6B+mY6G9/eieuM=";

            when(userRepository.fetchPasswordHash(testUserId)).thenReturn(storedHash);

            boolean result = userService.verifyPassword(testUserId, "wrongpassword");

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for non-existent user")
        void verifyPassword_NonExistentUser_ReturnsFalse() {
            when(userRepository.fetchPasswordHash(testUserId)).thenReturn(null);

            boolean result = userService.verifyPassword(testUserId, "password123");

            assertThat(result).isFalse();
        }
    }
}