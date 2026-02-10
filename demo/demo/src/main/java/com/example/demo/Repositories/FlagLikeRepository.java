package com.example.demo.Repositories;

import com.example.demo.Models.FlagLike;
import com.example.demo.Models.Flag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class FlagLikeRepository {
    private final JdbcTemplate jdbc;

    public FlagLikeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    


    public UUID likeFlag(UUID flagId, UUID userId) {
        UUID likeId = UUID.randomUUID();
        String sql = """
            INSERT INTO flag_likes (id, flag_id, user_id)
            VALUES (?, ?, ?)
            ON CONFLICT (flag_id, user_id) DO NOTHING
        """;
        jdbc.update(sql, likeId, flagId, userId);
        return likeId;
    }

    public boolean unlikeFlag(UUID flagId, UUID userId) {
        String sql = "DELETE FROM flag_likes WHERE flag_id = ? AND user_id = ?";
        int rows = jdbc.update(sql, flagId, userId);
        return rows > 0;
    }

    public boolean isLikedByUser(UUID flagId, UUID userId) {
        String sql = "SELECT COUNT(*) FROM flag_likes WHERE flag_id = ? AND user_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, flagId, userId);
        return count != null && count > 0;
    }

    public int countLikes(UUID flagId) {
        String sql = "SELECT COUNT(*) FROM flag_likes WHERE flag_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, flagId);
        return count != null ? count : 0;
    }

    public int countLikesGivenByUser(UUID userId) {
        String sql = "SELECT COUNT(*) FROM flag_likes WHERE user_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    public List<FlagLike> fetchLikesForFlag(UUID flagId) {
        String sql = """
            SELECT id, flag_id, user_id, created_at
            FROM flag_likes WHERE flag_id = ?
            ORDER BY created_at DESC
        """;
        return jdbc.query(sql, (rs, rowNum) -> new FlagLike(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("flag_id")),
                UUID.fromString(rs.getString("user_id")),
                rs.getObject("created_at", OffsetDateTime.class)
        ), flagId);
    }

    public List<Flag> fetchFlagsLikedByUser(UUID userId, String cursor, int limit) {
        StringBuilder sql = new StringBuilder("""
            select
              f.id,
              f.user_id,
              f.title,
              f.description,
              st_y(f.location::geometry) as lat,
              st_x(f.location::geometry) as lon,
              f.city,
              f.address_text,
              f.category,
              f.image_url,
              f.is_public,
              f.expires_at,
              f.created_at,
              f.updated_at,
              fl.id as like_id
            from flags f
            join flag_likes fl on fl.flag_id = f.id
            where fl.user_id = ?
        """);

        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(userId);

        if (cursor != null && !cursor.isBlank()) {
            try {
                UUID cursorId = UUID.fromString(cursor);
                sql.append(" and fl.id > ?");
                params.add(cursorId);
            } catch (IllegalArgumentException ignored) {}
        }

        sql.append(" order by fl.id asc limit ?");
        params.add(limit);

        return jdbc.query(sql.toString(), this::mapFlag, params.toArray());
    }

    // <-- ADD THIS (same shape as FlagRepository's mapper)
    private Flag mapFlag(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
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
                rs.getString("image_url"),
                rs.getBoolean("is_public"),
                rs.getObject("expires_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class)
        );
    }

}