package com.example.demo.Service;

import com.example.demo.Models.*;
import com.example.demo.Repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final int MAX_RADIUS_M = 40000; // ~25 mi
    private static final int MIN_RADIUS_M = 100;
    private static final int MAX_LIMIT = 100;

    private final UserRepository repo;
    private final LandmarkService landmarkService;
    private final FlagService flagService;

    public UserService(UserRepository repo, LandmarkService landmarkService, FlagService flagService) {
        this.repo = repo;
        this.landmarkService = landmarkService;
        this.flagService = flagService;
    }

    // ==================== USER CRUD ====================

    public User createUser(CreateUserRequest request) {
        // Validate required fields
        if (request.username() == null || request.username().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        // Check uniqueness
        if (repo.usernameExists(request.username())) {
            throw new IllegalArgumentException("Username already taken");
        }
        if (repo.emailExists(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Hash password (use BCrypt in production!)
        String passwordHash = hashPassword(request.password());

        UserType userType = UserType.from(request.userType());

        UUID userId = repo.createUser(
                request.username(),
                request.email(),
                passwordHash,
                request.displayName() != null ? request.displayName() : request.username(),
                userType,
                request.businessName(),
                request.businessCategory()
        );

        return repo.fetchUserById(userId);
    }

    public User getUserById(UUID userId) {
        return repo.fetchUserById(userId);
    }

    public User getUserByUsername(String username) {
        return repo.fetchUserByUsername(username);
    }

    public UserProfile getPublicProfile(String username) {
        User user = repo.fetchUserByUsername(username);
        if (user == null) {
            return null;
        }

        // Check if profile is public
        if (!user.profilePublic()) {
            return null; // Or throw an exception, depending on your preference
        }

        int eventCount = repo.countEvents(user.id());
        int followerCount = repo.countFollowers(user.id());
        int followingCount = repo.countFollowing(user.id());

        return UserProfile.from(user, eventCount, followerCount, followingCount);
    }

    public UserProfile getPublicProfileById(UUID userId) {
        User user = repo.fetchUserById(userId);
        if (user == null || !user.profilePublic()) {
            return null;
        }

        int eventCount = repo.countEvents(user.id());
        int followerCount = repo.countFollowers(user.id());
        int followingCount = repo.countFollowing(user.id());

        return UserProfile.from(user, eventCount, followerCount, followingCount);
    }

    public User updateUser(UUID userId, UpdateUserRequest request) {
        User existing = repo.fetchUserById(userId);
        if (existing == null) {
            return null;
        }

        boolean updated = repo.updateUser(
                userId,
                request.displayName(),
                request.bio(),
                request.profileImageUrl(),
                request.lat(),
                request.lon(),
                request.city(),
                request.addressText(),
                request.businessName(),
                request.businessCategory(),
                request.locationVisible(),
                request.profilePublic()
        );

        return updated ? repo.fetchUserById(userId) : existing;
    }

    public boolean updateLocation(UUID userId, double lat, double lon) {
        return repo.updateLocation(userId, lat, lon);
    }

    // ==================== DISCOVERY ====================

    public List<UserProfile> getUsersNearby(double lat, double lon, double radiusMiles, int limit) {
        int radiusM = (int) (radiusMiles * 1609.34);
        int clampedRadius = clamp(radiusM, MIN_RADIUS_M, MAX_RADIUS_M);
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        List<User> users = repo.fetchUsersNearby(lon, lat, clampedRadius, clampedLimit);

        return users.stream()
                .map(u -> UserProfile.from(u,
                        repo.countEvents(u.id()),
                        repo.countFollowers(u.id()),
                        repo.countFollowing(u.id())))
                .collect(Collectors.toList());
    }

    public List<UserProfile> getBusinessesNearby(
            double lat, double lon, double radiusMiles, String category, int limit
    ) {
        int radiusM = (int) (radiusMiles * 1609.34);
        int clampedRadius = clamp(radiusM, MIN_RADIUS_M, MAX_RADIUS_M);
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        List<User> users = repo.fetchBusinessesNearby(lon, lat, clampedRadius, category, clampedLimit);

        return users.stream()
                .map(u -> UserProfile.from(u,
                        repo.countEvents(u.id()),
                        repo.countFollowers(u.id()),
                        repo.countFollowing(u.id())))
                .collect(Collectors.toList());
    }

    public List<UserProfile> searchUsers(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        int clampedLimit = clamp(limit, 1, MAX_LIMIT);
        List<User> users = repo.searchUsers(query.trim(), clampedLimit);

        return users.stream()
                .map(u -> UserProfile.from(u,
                        repo.countEvents(u.id()),
                        repo.countFollowers(u.id()),
                        repo.countFollowing(u.id())))
                .collect(Collectors.toList());
    }

    // ==================== FOLLOW SYSTEM ====================

    public boolean followUser(UUID followerId, UUID followingId) {
        // Verify both users exist
        if (repo.fetchUserById(followerId) == null || repo.fetchUserById(followingId) == null) {
            return false;
        }
        return repo.followUser(followerId, followingId);
    }

    public boolean unfollowUser(UUID followerId, UUID followingId) {
        return repo.unfollowUser(followerId, followingId);
    }

    public boolean isFollowing(UUID followerId, UUID followingId) {
        return repo.isFollowing(followerId, followingId);
    }

    public UsersResponse getFollowers(UUID userId, String cursor, int limit) {
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        List<User> users = repo.fetchFollowers(userId, cursor, clampedLimit + 1);

        String nextCursor = null;
        if (users.size() > clampedLimit) {
            users = users.subList(0, clampedLimit);
            nextCursor = users.get(users.size() - 1).id().toString();
        }

        List<UserProfile> profiles = users.stream()
                .map(u -> UserProfile.from(u,
                        repo.countEvents(u.id()),
                        repo.countFollowers(u.id()),
                        repo.countFollowing(u.id())))
                .collect(Collectors.toList());

        return new UsersResponse(profiles, nextCursor);
    }

    public UsersResponse getFollowing(UUID userId, String cursor, int limit) {
        int clampedLimit = clamp(limit, 1, MAX_LIMIT);

        List<User> users = repo.fetchFollowing(userId, cursor, clampedLimit + 1);

        String nextCursor = null;
        if (users.size() > clampedLimit) {
            users = users.subList(0, clampedLimit);
            nextCursor = users.get(users.size() - 1).id().toString();
        }

        List<UserProfile> profiles = users.stream()
                .map(u -> UserProfile.from(u,
                        repo.countEvents(u.id()),
                        repo.countFollowers(u.id()),
                        repo.countFollowing(u.id())))
                .collect(Collectors.toList());

        return new UsersResponse(profiles, nextCursor);
    }

    // ==================== AUTH HELPERS ====================

    /**
     * Simple password verification (use BCrypt in production!)
     */
    public boolean verifyPassword(UUID userId, String password) {
        String storedHash = repo.fetchPasswordHash(userId);
        if (storedHash == null) return false;
        return storedHash.equals(hashPassword(password));
    }

    /**
     * Simple password hashing (use BCrypt in production!)
     */
    private String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    // Debug method to get all usernames
    public List<String> getAllUsernames() {
        return repo.getAllUsernames();
    }

    // Add this method to UserService
public EnhancedUserProfile getEnhancedPublicProfile(String username, UUID currentUserId) {
    log.info("getEnhancedPublicProfile called with username: '{}', currentUserId: {}", username, currentUserId);
    
    User user = repo.fetchUserByUsername(username);
    log.info("fetchUserByUsername returned: {}", user != null ? "User found" : "User is null");
    
    if (user == null) {
        log.warn("User '{}' not found in database", username);
        return null;
    }
    
    if (!user.profilePublic()) {
        log.warn("User '{}' has private profile", username);
        return null;
    }

    int followerCount = repo.countFollowers(user.id());
    int followingCount = repo.countFollowing(user.id());
    int eventCount = repo.countEvents(user.id());
    int landmarkCount = landmarkService.countUserLandmarks(user.id());
    int flagCount = flagService.countUserFlags(user.id());
    int totalLikesGiven = flagService.getUserLikeCount(user.id());

    List<Landmark> landmarks = landmarkService.getUserLandmarks(user.id(), 10);
    List<Flag> recentFlags = flagService.getUserFlags(user.id(), 10);

    // Attach like counts to flags
    List<FlagWithLikeCount> flagsWithLikeCounts = recentFlags.stream()
            .map(flag -> new FlagWithLikeCount(
                    flag,
                    flagService.getLikeCount(flag.id()),
                    currentUserId != null ? flagService.isLiked(flag.id(), currentUserId) : false
            ))
            .collect(java.util.stream.Collectors.toList());

    return EnhancedUserProfile.from(
            user,
            followerCount,
            followingCount,
            eventCount,
            landmarkCount,
            flagCount,
            totalLikesGiven,
            landmarks,
            recentFlags,
            flagsWithLikeCounts
    );
}

// ==================== FRIENDS (MUTUAL FOLLOWS) ====================

public UsersResponse getFriends(UUID userId, String cursor, int limit) {
    int clampedLimit = clamp(limit, 1, MAX_LIMIT);

    List<User> users = repo.fetchFriends(userId, cursor, clampedLimit + 1);

    String nextCursor = null;
    if (users.size() > clampedLimit) {
        users = users.subList(0, clampedLimit);
        nextCursor = users.get(users.size() - 1).id().toString();
    }

    List<UserProfile> profiles = users.stream()
            .map(u -> UserProfile.from(u,
                    repo.countEvents(u.id()),
                    repo.countFollowers(u.id()),
                    repo.countFollowing(u.id())))
            .collect(java.util.stream.Collectors.toList());

    return new UsersResponse(profiles, nextCursor);
}

public int getFriendCount(UUID userId) {
    return repo.countFriends(userId);
}

}
