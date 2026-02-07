package com.example.demo.Repositories;

import com.example.demo.Models.Landmark;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class LandmarkRepository {
    private final JdbcTemplate jdbc;

    public LandmarkRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID createLandmark(
            UUID userId,
            String name,
            String description,
            double lat,
            double lon,
            String category
    ) {
        UUID landmarkId = UUID.randomUUID();
        String sql = """
            INSERT INTO landmarks (id, user_id, name, description, location, lat, lon, category, last_visited_at)
            VALUES (?, ?, ?, ?, st_setsrid(st_makepoint(?, ?), 4326)::geography, ?, ?, ?, NOW())
        """;
        jdbc.update(sql, landmarkId, userId, name, description, lon, lat, lat, lon, category);
        return landmarkId;
    }

    public Landmark fetchLandmarkById(UUID id) {
        String sql = """
            SELECT id, user_id, name, description, 
                   st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                   category, visit_count, last_visited_at, created_at, updated_at
            FROM landmarks WHERE id = ?
        """;
        List<Landmark> results = jdbc.query(sql, this::mapLandmark, id);
        return results.isEmpty() ? null : results.get(0);
    }

    public List<Landmark> fetchLandmarksByUser(UUID userId, int limit) {
        String sql = """
            SELECT id, user_id, name, description,
                   st_y(location::geometry) as lat, st_x(location::geometry) as lon,
                   category, visit_count, last_visited_at, created_at, updated_at
            FROM landmarks WHERE user_id = ?
            ORDER BY last_visited_at DESC NULLS LAST
            LIMIT ?
        """;
        return jdbc.query(sql, this::mapLandmark, userId, limit);
    }

    public boolean updateLandmark(
            UUID landmarkId,
            String name,
            String description,
            String category
    ) {
        StringBuilder sql = new StringBuilder("UPDATE landmarks SET updated_at = NOW()");
        List<Object> params = new java.util.ArrayList<>();

        if (name != null) {
            sql.append(", name = ?");
            params.add(name);
        }
        if (description != null) {
            sql.append(", description = ?");
            params.add(description);
        }
        if (category != null) {
            sql.append(", category = ?");
            params.add(category);
        }

        sql.append(" WHERE id = ?");
        params.add(landmarkId);

        int rows = jdbc.update(sql.toString(), params.toArray());
        return rows > 0;
    }

    public boolean incrementVisitCount(UUID landmarkId) {
        String sql = """
            UPDATE landmarks 
            SET visit_count = visit_count + 1, 
                last_visited_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        """;
        int rows = jdbc.update(sql, landmarkId);
        return rows > 0;
    }

    public boolean deleteLandmark(UUID landmarkId) {
        String sql = "DELETE FROM landmarks WHERE id = ?";
        int rows = jdbc.update(sql, landmarkId);
        return rows > 0;
    }

    public int countUserLandmarks(UUID userId) {
        String sql = "SELECT COUNT(*) FROM landmarks WHERE user_id = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    private Landmark mapLandmark(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new Landmark(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("user_id")),
                rs.getString("name"),
                rs.getString("description"),
                rs.getDouble("lat"),
                rs.getDouble("lon"),
                rs.getString("category"),
                rs.getInt("visit_count"),
                rs.getObject("last_visited_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class)
        );
    }
}