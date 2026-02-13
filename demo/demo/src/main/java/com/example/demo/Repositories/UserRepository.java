package com.example.demo.Repositories;

import com.example.demo.Models.User;
import com.example.demo.Models.UserType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class UserRepository {

    private static final Logger log = LoggerFactory.getLogger(UserRepository.class);
    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID createUser(
            String username,
            String email,
            String passwordHash,
            String displayName,
            UserType userType,
            String businessName,
            String businessCategory
    ) {
        UUID userId = UUID.randomUUID();
        String sql = """
            insert into users (
                id, username, email, password_hash, display_name, user_type,
                business_name, business_category, location_visible, profile_public,
                verified, created_at, last_active_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, true, true, false, now(), now())
        """;

        jdbc.update(sql, userId, username, email, passwordHash, displayName,
                userType.name(), businessName, businessCategory);
        return userId;
    }

    public User fetchUserById(UUID id) {
        String sql = "SELECT " +
                "id, username, email, display_name, bio, profile_image_path, " +
                "user_type, " +
                "CASE WHEN location IS NOT NULL THEN st_y(location::geometry) ELSE NULL END as lat, " +
                "CASE WHEN location IS NOT NULL THEN st_x(location::geometry) ELSE NULL END as lon, " +
                "city, address_text, business_name, business_category, location_visible, " +
                "profile_public, verified, created_at, last_active_at " +
                "FROM users " +
                "WHERE id = ?";

        List<User> results = jdbc.query(sql, this::mapUser, id);
        return results.isEmpty() ? null : results.get(0);
    }

public User fetchUserByUsername(String username) {
    log.info("fetchUserByUsername called with username: '{}'", username);
    String sql = """
        select
            id, username, email, display_name, bio, profile_image_path,
            user_type, 
            CASE WHEN location IS NOT NULL THEN st_y(location::geometry) ELSE NULL END as lat, 
            CASE WHEN location IS NOT NULL THEN st_x(location::geometry) ELSE NULL END as lon,
            city, address_text, business_name, business_category, location_visible,
            profile_public, verified, created_at, last_active_at
        from users
        where lower(username) = lower(?)
        limit 1
    """;

    try {
        List<User> results = jdbc.query(sql, this::mapUser, username);
        log.info("fetchUserByUsername query returned {} results", results.size());
        return results.stream().findFirst().orElse(null);
    } catch (Exception e) {
        log.error("Error executing query for username '{}': {}", username, e.getMessage());
        throw e;
    }
}

    public User fetchUserByEmail(String email) {
        String sql = """
            select
                id, username, email, display_name, bio, profile_image_path,
                user_type, st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                city, address_text, business_name, business_category, location_visible,
                profile_public, verified, created_at, last_active_at
            from users
            where lower(email) = lower(?)
        """;

        List<User> results = jdbc.query(sql, this::mapUser, email);
        return results.isEmpty() ? null : results.get(0);
    }

    public String fetchPasswordHash(UUID userId) {
        String sql = "select password_hash from users where id = ?";
        try {
            return jdbc.queryForObject(sql, String.class, userId);
        } catch (Exception e) {
            return null;
        }
    }

    public boolean updateUser(
            UUID userId,
            String displayName,
            String bio,
            String profileImagePath,
            Double lat,
            Double lon,
            String city,
            String addressText,
            String businessName,
            String businessCategory,
            Boolean locationVisible,
            Boolean profilePublic
    ) {
        StringBuilder sql = new StringBuilder("update users set last_active_at = now()");
        List<Object> params = new java.util.ArrayList<>();

        if (displayName != null) {
            sql.append(", display_name = ?");
            params.add(displayName);
        }
        if (bio != null) {
            sql.append(", bio = ?");
            params.add(bio);
        }
        if (profileImagePath != null) {
            sql.append(", profile_image_path = ?");
            params.add(profileImagePath);
        }
        if (lat != null && lon != null) {
            sql.append(", location = st_setsrid(st_makepoint(?, ?), 4326)::geography");
            params.add(lon);
            params.add(lat);
        }
        if (city != null) {
            sql.append(", city = ?");
            params.add(city);
        }
        if (addressText != null) {
            sql.append(", address_text = ?");
            params.add(addressText);
        }
        if (businessName != null) {
            sql.append(", business_name = ?");
            params.add(businessName);
        }
        if (businessCategory != null) {
            sql.append(", business_category = ?");
            params.add(businessCategory);
        }
        if (locationVisible != null) {
            sql.append(", location_visible = ?");
            params.add(locationVisible);
        }
        if (profilePublic != null) {
            sql.append(", profile_public = ?");
            params.add(profilePublic);
        }

        sql.append(" where id = ?");
        params.add(userId);

        int rows = jdbc.update(sql.toString(), params.toArray());
        return rows > 0;
    }

    public boolean updateLocation(UUID userId, double lat, double lon) {
        String sql = """
            update users
            set location = st_setsrid(st_makepoint(?, ?), 4326)::geography,
                last_active_at = now()
            where id = ?
        """;
        int rows = jdbc.update(sql, lon, lat, userId);
        return rows > 0;
    }

    public boolean updateLastActive(UUID userId) {
        String sql = "update users set last_active_at = now() where id = ?";
        int rows = jdbc.update(sql, userId);
        return rows > 0;
    }

    /**
     * Find users near a location (for map view)
     */
    public List<User> fetchUsersNearby(double lon, double lat, int radiusM, int limit) {
        String sql = """
            select
                id, username, email, display_name, bio, profile_image_path,
                user_type, st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                city, address_text, business_name, business_category, location_visible,
                profile_public, verified, created_at, last_active_at
            from users
            where location_visible = true
              and profile_public = true
              and location is not null
              and st_dwithin(
                  location,
                  st_setsrid(st_makepoint(?, ?), 4326)::geography,
                  ?
              )
            order by last_active_at desc
            limit ?
        """;

        return jdbc.query(sql, this::mapUser, lon, lat, radiusM, limit);
    }

    /**
     * Find business accounts near a location
     */
    public List<User> fetchBusinessesNearby(double lon, double lat, int radiusM, String category, int limit) {
        StringBuilder sql = new StringBuilder("""
            select
                id, username, email, display_name, bio, profile_image_path,
                user_type, st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                city, address_text, business_name, business_category, location_visible,
                profile_public, verified, created_at, last_active_at
            from users
            where user_type = 'BUSINESS'
              and profile_public = true
              and location is not null
              and st_dwithin(
                  location,
                  st_setsrid(st_makepoint(?, ?), 4326)::geography,
                  ?
              )
        """);

        List<Object> params = new java.util.ArrayList<>();
        params.add(lon);
        params.add(lat);
        params.add(radiusM);

        if (category != null && !category.isEmpty()) {
            sql.append(" and lower(business_category) = lower(?)");
            params.add(category);
        }

        sql.append(" order by verified desc, last_active_at desc limit ?");
        params.add(limit);

        return jdbc.query(sql.toString(), this::mapUser, params.toArray());
    }

    /**
     * Search users by username or display name
     */
    public List<User> searchUsers(String query, int limit) {
        String sql = """
            select
                id, username, email, display_name, bio, profile_image_path,
                user_type, st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                city, address_text, business_name, business_category, location_visible,
                profile_public, verified, created_at, last_active_at
            from users
            where profile_public = true
              and (lower(username) like lower(?) or lower(display_name) like lower(?))
            order by verified desc, username asc
            limit ?
        """;

        String pattern = "%" + query + "%";
        return jdbc.query(sql, this::mapUser, pattern, pattern, limit);
    }

    // ==================== FOLLOW SYSTEM ====================

    public boolean followUser(UUID followerId, UUID followingId) {
        // Don't allow self-follow
        if (followerId.equals(followingId)) return false;

        String sql = """
            insert into user_follows (follower_id, following_id, created_at)
            values (?, ?, now())
            on conflict (follower_id, following_id) do nothing
        """;
        int rows = jdbc.update(sql, followerId, followingId);
        return rows > 0;
    }

    public boolean unfollowUser(UUID followerId, UUID followingId) {
        String sql = "delete from user_follows where follower_id = ? and following_id = ?";
        int rows = jdbc.update(sql, followerId, followingId);
        return rows > 0;
    }

    public boolean isFollowing(UUID followerId, UUID followingId) {
        String sql = "select count(*) from user_follows where follower_id = ? and following_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, followerId, followingId);
        return count != null && count > 0;
    }

    public List<User> fetchFollowers(UUID userId, String cursor, int limit) {
        StringBuilder sql = new StringBuilder("""
            select
                u.id, u.username, u.email, u.display_name, u.bio, u.profile_image_path,
                u.user_type, st_y(u.location::geometry) as lat, st_x(u.location::geometry) as lon,
                u.city, u.address_text, u.business_name, u.business_category, u.location_visible,
                u.profile_public, u.verified, u.created_at, u.last_active_at
            from users u
            join user_follows f on f.follower_id = u.id
            where f.following_id = ?
        """);

        List<Object> params = new java.util.ArrayList<>();
        params.add(userId);

        if (cursor != null && !cursor.isEmpty()) {
            try {
                UUID cursorId = UUID.fromString(cursor);
                sql.append(" and u.id > ?");
                params.add(cursorId);
            } catch (IllegalArgumentException e) {
                // Invalid cursor, ignore
            }
        }

        sql.append(" order by u.id asc limit ?");
        params.add(limit);

        return jdbc.query(sql.toString(), this::mapUser, params.toArray());
    }

    public List<User> fetchFollowing(UUID userId, String cursor, int limit) {
        StringBuilder sql = new StringBuilder("""
            select
                u.id, u.username, u.email, u.display_name, u.bio, u.profile_image_path,
                u.user_type, st_y(u.location::geometry) as lat, st_x(u.location::geometry) as lon,
                u.city, u.address_text, u.business_name, u.business_category, u.location_visible,
                u.profile_public, u.verified, u.created_at, u.last_active_at
            from users u
            join user_follows f on f.following_id = u.id
            where f.follower_id = ?
        """);

        List<Object> params = new java.util.ArrayList<>();
        params.add(userId);

        if (cursor != null && !cursor.isEmpty()) {
            try {
                UUID cursorId = UUID.fromString(cursor);
                sql.append(" and u.id > ?");
                params.add(cursorId);
            } catch (IllegalArgumentException e) {
                // Invalid cursor, ignore
            }
        }

        sql.append(" order by u.id asc limit ?");
        params.add(limit);

        return jdbc.query(sql.toString(), this::mapUser, params.toArray());
    }

    public int countFollowers(UUID userId) {
        String sql = "select count(*) from user_follows where following_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    public int countFollowing(UUID userId) {
        String sql = "select count(*) from user_follows where follower_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    public int countEvents(UUID userId) {
        String sql = "select count(*) from events where owner = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId.toString());
        return count != null ? count : 0;
    }

    public boolean usernameExists(String username) {
        String sql = "select count(*) from users where lower(username) = lower(?)";
        Integer count = jdbc.queryForObject(sql, Integer.class, username);
        return count != null && count > 0;
    }

    public boolean emailExists(String email) {
        String sql = "select count(*) from users where lower(email) = lower(?)";
        Integer count = jdbc.queryForObject(sql, Integer.class, email);
        return count != null && count > 0;
    }

    // Debug method to get all usernames
    public List<String> getAllUsernames() {
        try {
            String sql = "SELECT username FROM users";
            return jdbc.queryForList(sql, String.class);
        } catch (Exception e) {
            log.error("Error getting all usernames: {}", e.getMessage());
            return List.of();
        }
    }

    // Row mapper helper
    private User mapUser(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Double lat = rs.getObject("lat") != null ? rs.getDouble("lat") : null;
        Double lon = rs.getObject("lon") != null ? rs.getDouble("lon") : null;
        
        String profileImagePath = rs.getString("profile_image_path");
        log.debug("Mapping user {} with profile_image_path: '{}'", rs.getString("username"), profileImagePath);

        return new User(
                UUID.fromString(rs.getString("id")),
                rs.getString("username"),
                rs.getString("email"),
                rs.getString("display_name"),
                rs.getString("bio"),
                profileImagePath,
                UserType.from(rs.getString("user_type")),
                lat,
                lon,
                rs.getString("city"),
                rs.getString("address_text"),
                rs.getString("business_name"),
                rs.getString("business_category"),
                rs.getBoolean("location_visible"),
                rs.getBoolean("profile_public"),
                rs.getBoolean("verified"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("last_active_at", OffsetDateTime.class)
        );
    }

    // ==================== FRIENDS (MUTUAL FOLLOWS) ====================

public List<User> fetchFriends(UUID userId, String cursor, int limit) {
    StringBuilder sql = new StringBuilder("""
        select
            u.id, u.username, u.email, u.display_name, u.bio, u.profile_image_path,
            u.user_type, st_y(u.location::geometry) as lat, st_x(u.location::geometry) as lon,
            u.city, u.address_text, u.business_name, u.business_category, u.location_visible,
            u.profile_public, u.verified, u.created_at, u.last_active_at
        from users u
        join user_follows f_out
          on f_out.following_id = u.id
         and f_out.follower_id = ?
        join user_follows f_in
          on f_in.follower_id = u.id
         and f_in.following_id = ?
        where 1=1
    """);

    List<Object> params = new java.util.ArrayList<>();
    params.add(userId);
    params.add(userId);

    if (cursor != null && !cursor.isBlank()) {
        try {
            UUID cursorId = UUID.fromString(cursor);
            sql.append(" and u.id > ?");
            params.add(cursorId);
        } catch (IllegalArgumentException ignored) {}
    }

    sql.append(" order by u.id asc limit ?");
    params.add(limit);

    return jdbc.query(sql.toString(), this::mapUser, params.toArray());
}

public int countFriends(UUID userId) {
    String sql = """
        select count(*)
        from user_follows f_out
        join user_follows f_in
          on f_in.follower_id = f_out.following_id
         and f_in.following_id = f_out.follower_id
        where f_out.follower_id = ?
    """;
    Integer count = jdbc.queryForObject(sql, Integer.class, userId);
    return count != null ? count : 0;
}

public List<User> fetchAllUsers() {
    String sql = "SELECT " +
            "id, username, email, display_name, bio, profile_image_path, " +
            "user_type, " +
            "business_name, business_category, " +
            "city, address_text, " +
            "st_y(location::geometry) as lat, st_x(location::geometry) as lon, " +
            "location_visible, profile_public, verified, " +
            "created_at, last_active_at " +
            "FROM users " +
            "ORDER BY display_name";
    
    return jdbc.query(sql, this::mapUser);
}

}
