package com.example.demo.Controllers;

import com.example.demo.Models.*;
import com.example.demo.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    // ==================== USER CRUD ====================

    /**
     * Register a new user
     */
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        try {
            User user = service.createUser(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create user"));
        }
    }

    /**
     * Get current user's profile (authenticated)
     */
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UUID userId = UUID.fromString(userIdHeader);
            User user = service.getUserById(userId);

            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update current user's profile
     */
    @PatchMapping("/me")
    public ResponseEntity<?> updateCurrentUser(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody UpdateUserRequest request
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UUID userId = UUID.fromString(userIdHeader);
            User user = service.updateUser(userId, request);

            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update current user's location (for map presence)
     */
    @PutMapping("/me/location")
    public ResponseEntity<?> updateLocation(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam double lat,
            @RequestParam double lon
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UUID userId = UUID.fromString(userIdHeader);
            boolean updated = service.updateLocation(userId, lat, lon);

            if (!updated) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(Map.of("message", "Location updated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== PUBLIC PROFILES ====================

    /**
     * Get public profile by username
     */
    @GetMapping("/{username}")
    public ResponseEntity<UserProfile> getProfileByUsername(@PathVariable String username) {
        UserProfile profile = service.getPublicProfile(username);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(profile);
    }

    /**
     * Get public profile by ID
     */
    @GetMapping("/id/{userId}")
    public ResponseEntity<UserProfile> getProfileById(@PathVariable String userId) {
        try {
            UUID id = UUID.fromString(userId);
            UserProfile profile = service.getPublicProfileById(id);

            if (profile == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== DISCOVERY ====================

    /**
     * Find users near a location (for map view)
     */
    @GetMapping("/nearby")
    public List<UserProfile> getUsersNearby(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5.0") double radiusMiles,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return service.getUsersNearby(lat, lon, radiusMiles, limit);
    }

    /**
     * Find businesses (clubs, restaurants) near a location
     */
    @GetMapping("/businesses/nearby")
    public List<UserProfile> getBusinessesNearby(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5.0") double radiusMiles,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return service.getBusinessesNearby(lat, lon, radiusMiles, category, limit);
    }

    /**
     * Search users by username or display name
     */
    @GetMapping("/search")
    public List<UserProfile> searchUsers(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return service.searchUsers(q, limit);
    }

    /**
     * Get all users (for development/testing - remove in production)
     */
    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        try {
            log.info("Getting all users for user selection");
            List<User> users = service.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error getting all users: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==================== FOLLOW SYSTEM ====================

    /**
     * Follow a user
     */
    @PostMapping("/{username}/follow")
    public ResponseEntity<?> followUser(
            @PathVariable String username,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UUID followerId = UUID.fromString(userIdHeader);
            User targetUser = service.getUserByUsername(username);

            if (targetUser == null) {
                return ResponseEntity.notFound().build();
            }

            boolean followed = service.followUser(followerId, targetUser.id());

            if (followed) {
                return ResponseEntity.ok(Map.of("message", "Now following " + username));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not follow user"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Unfollow a user
     */
    @DeleteMapping("/{username}/follow")
    public ResponseEntity<?> unfollowUser(
            @PathVariable String username,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UUID followerId = UUID.fromString(userIdHeader);
            User targetUser = service.getUserByUsername(username);

            if (targetUser == null) {
                return ResponseEntity.notFound().build();
            }

            boolean unfollowed = service.unfollowUser(followerId, targetUser.id());

            if (unfollowed) {
                return ResponseEntity.ok(Map.of("message", "Unfollowed " + username));
            } else {
                return ResponseEntity.ok(Map.of("message", "Was not following " + username));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check if current user is following a user
     */
    @GetMapping("/{username}/is-following")
    public ResponseEntity<?> isFollowing(
            @PathVariable String username,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UUID followerId = UUID.fromString(userIdHeader);
            User targetUser = service.getUserByUsername(username);

            if (targetUser == null) {
                return ResponseEntity.notFound().build();
            }

            boolean isFollowing = service.isFollowing(followerId, targetUser.id());
            return ResponseEntity.ok(Map.of("following", isFollowing));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get a user's followers
     */
    @GetMapping("/{username}/followers")
    public ResponseEntity<UsersResponse> getFollowers(
            @PathVariable String username,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit
    ) {
        User user = service.getUserByUsername(username);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        UsersResponse response = service.getFollowers(user.id(), cursor, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * Get users that a user is following
     */
    @GetMapping("/{username}/following")
    public ResponseEntity<UsersResponse> getFollowing(
            @PathVariable String username,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit
    ) {
        User user = service.getUserByUsername(username);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        UsersResponse response = service.getFollowing(user.id(), cursor, limit);
        return ResponseEntity.ok(response);
    }

    // Add to UserController
@GetMapping("/{username}/profile")
public ResponseEntity<EnhancedUserProfile> getEnhancedProfile(
        @PathVariable String username,
        @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
) {
    log.info("getEnhancedProfile endpoint called with username: '{}', userIdHeader: '{}'", username, userIdHeader);
    try {
        UUID currentUserId = userIdHeader != null && !userIdHeader.isBlank() ? 
                UUID.fromString(userIdHeader) : null;
        log.info("Parsed currentUserId: {}", currentUserId);
        
        EnhancedUserProfile profile = service.getEnhancedPublicProfile(username, currentUserId);
        log.info("Service returned profile: {}", profile != null ? "Profile found" : "Profile is null");
        
        return profile != null ? ResponseEntity.ok(profile) : ResponseEntity.notFound().build();
    } catch (Exception e) {
        log.error("Error in getEnhancedProfile for username '{}': {}", username, e.getMessage(), e);
        return ResponseEntity.badRequest().build();
    }
}
// ==================== FRIENDS (MUTUAL FOLLOWS) ====================

@GetMapping("/{username}/friends")
public ResponseEntity<UsersResponse> getFriends(
        @PathVariable String username,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int limit
) {
    User user = service.getUserByUsername(username);
    if (user == null) return ResponseEntity.notFound().build();

    UsersResponse response = service.getFriends(user.id(), cursor, limit);
    return ResponseEntity.ok(response);
}

@GetMapping("/{username}/friends/count")
public ResponseEntity<Map<String, Integer>> getFriendCount(@PathVariable String username) {
    User user = service.getUserByUsername(username);
    if (user == null) return ResponseEntity.notFound().build();

    int count = service.getFriendCount(user.id());
    return ResponseEntity.ok(Map.of("friendCount", count));
}

}

