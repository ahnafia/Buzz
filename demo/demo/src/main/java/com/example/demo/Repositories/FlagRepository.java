package com.example.demo.Repositories;

import com.example.demo.Models.Flag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class FlagRepository {
    private final JdbcTemplate jdbc;
    private final javax.sql.DataSource dataSource;

    public FlagRepository(JdbcTemplate jdbc, javax.sql.DataSource dataSource) {
        this.jdbc = jdbc;
        this.dataSource = dataSource;
    }

    public UUID createFlag(
            UUID userId,
            String title,
            String description,
            double lat,
            double lon,
            String city,
            String addressText,
            String category,
            String imageUrl,
            String[] imagePaths,
            String color,
            boolean isPublic,
            OffsetDateTime expiresAt
    ) {
        UUID flagId = UUID.randomUUID();
        String sql = """
            INSERT INTO flags (id, user_id, title, description, location, lat, lon, 
                              city, address_text, category, image_paths, color, is_public, expires_at)
            VALUES (?, ?, ?, ?, st_setsrid(st_makepoint(?, ?), 4326)::geography, ?, ?, 
                   ?, ?, ?, ?, ?, ?, ?)
        """;
        jdbc.update(sql, flagId, userId, title, description, lon, lat, lat, lon, city, 
                   addressText, category, imagePaths, color, isPublic, expiresAt);
        return flagId;
    }

    public Flag fetchFlagById(UUID id) {
        String sql = """
            SELECT id, user_id, title, description,
                   st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                   city, address_text, category, image_paths, color, is_public, expires_at, created_at, updated_at
            FROM flags WHERE id = ? AND (expires_at IS NULL OR expires_at > NOW())
        """;
        List<Flag> results = jdbc.query(sql, this::mapFlag, id);
        return results.isEmpty() ? null : results.get(0);
    }

    public List<Flag> fetchFlagsByUser(UUID userId, int limit) {
        String sql = """
            SELECT id, user_id, title, description,
                   st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                   city, address_text, category, image_paths, color, is_public, expires_at, created_at, updated_at
            FROM flags WHERE user_id = ? AND is_public = true 
                   AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
            LIMIT ?
        """;
        return jdbc.query(sql, this::mapFlag, userId, limit);
    }

    /**
     * Fetch all flags for a user, including private and expired ones.
     * Used for the creator's own "My Map" so their history is always visible.
     */
    public List<Flag> fetchAllFlagsByUserIncludingExpired(UUID userId, int limit) {
        String sql = """
            SELECT id, user_id, title, description,
                   st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                   city, address_text, category, image_paths, color, is_public, expires_at, created_at, updated_at
            FROM flags
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """;
        return jdbc.query(sql, this::mapFlag, userId, limit);
    }

    public List<Flag> fetchFlagsNearby(
            double lon,
            double lat,
            int radiusM,
            int limit
    ) {
        String sql = """
            SELECT id, user_id, title, description,
                   st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                   city, address_text, category, image_paths, color, is_public, expires_at, created_at, updated_at
            FROM flags WHERE is_public = true 
                   AND (expires_at IS NULL OR expires_at > NOW())
                   AND st_dwithin(location, 
                           st_setsrid(st_makepoint(?, ?), 4326)::geography, ?)
            ORDER BY created_at DESC
            LIMIT ?
        """;
        return jdbc.query(sql, this::mapFlag, lon, lat, radiusM, limit);
    }

    public boolean updateFlag(
            UUID flagId,
            String title,
            String description,
            String city,
            String addressText,
            String category,
            String color,
            Boolean isPublic
    ) {
        StringBuilder sql = new StringBuilder("UPDATE flags SET updated_at = NOW()");
        List<Object> params = new java.util.ArrayList<>();

        if (title != null) {
            sql.append(", title = ?");
            params.add(title);
        }
        if (description != null) {
            sql.append(", description = ?");
            params.add(description);
        }
        if (city != null) {
            sql.append(", city = ?");
            params.add(city);
        }
        if (addressText != null) {
            sql.append(", address_text = ?");
            params.add(addressText);
        }
        if (category != null) {
            sql.append(", category = ?");
            params.add(category);
        }
        if (color != null) {
            sql.append(", color = ?");
            params.add(color);
        }
        if (isPublic != null) {
            sql.append(", is_public = ?");
            params.add(isPublic);
        }

        sql.append(" WHERE id = ?");
        params.add(flagId);

        int rows = jdbc.update(sql.toString(), params.toArray());
        return rows > 0;
    }

    public boolean deleteFlag(UUID flagId) {
        System.out.println("🗑️ FlagRepository.deleteFlag called with ID: " + flagId);
        
        // With CASCADE delete, this will automatically delete all related flag_likes
        String sql = "DELETE FROM flags WHERE id = ?";
        System.out.println("📝 Executing SQL: " + sql);
        int rows = jdbc.update(sql, flagId);
        System.out.println("📊 Rows affected: " + rows);
        
        boolean result = rows > 0;
        System.out.println("✅ Hard delete result: " + result + " (CASCADE will handle related records)");
        return result;
    }

    public int countUserFlags(UUID userId) {
        String sql = "SELECT COUNT(*) FROM flags WHERE user_id = ? AND is_public = true";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    private Flag mapFlag(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        // Handle image_paths array from database
        java.sql.Array imagePathsArray = rs.getArray("image_paths");
        String[] imagePaths = new String[]{};
        if (imagePathsArray != null) {
            Object[] arrayData = (Object[]) imagePathsArray.getArray();
            imagePaths = new String[arrayData.length];
            for (int i = 0; i < arrayData.length; i++) {
                imagePaths[i] = arrayData[i] != null ? arrayData[i].toString() : null;
            }
        }
        
        return new Flag(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("user_id")),
                rs.getString("title"),
                rs.getString("description"),
                rs.getDouble("lat"),
                rs.getDouble("lon"),
                rs.getString("city"),
                rs.getString("address_text"),
                rs.getString("category"),
                null, // imageUrl is legacy, set to null
                imagePaths,
                rs.getString("color"),
                rs.getBoolean("is_public"),
                rs.getObject("expires_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class)
        );
    }
}