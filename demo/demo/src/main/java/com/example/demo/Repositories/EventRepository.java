package com.example.demo.Repositories;
import com.example.demo.Models.EventPin;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class EventRepository {

    private static final Logger log = LoggerFactory.getLogger(EventRepository.class);
    private final JdbcTemplate jdbc;
    private final DataSource dataSource;

    public EventRepository(JdbcTemplate jdbc, DataSource dataSource) {
        this.jdbc = jdbc;
        this.dataSource = dataSource;
    }

public List<EventPin> fetchPins(
        double lon,
        double lat,
        int radiusM,
        OffsetDateTime timeStart,
        OffsetDateTime timeEnd,
        List<String> categories,
        int limit
) {
    // Distance-only filter (no time window, no expiry).
    // Keep other params for interface compatibility, but they are unused.

    String sqlTemplate = """
        select
          id,
          title,
          category,
          start_time,
          coalesce(expires_at, end_time) as expires_at,
          owner,
          st_y(location::geometry) as lat,
          st_x(location::geometry) as lon,
          description,
          image_path
        from events
        where st_dwithin(
          location,
          st_setsrid(st_makepoint(?, ?), 4326)::geography,
          ?
        )
        %s
        order by start_time asc
        limit ?;
        """;

    boolean noCategoryFilter = (categories == null || categories.isEmpty());

    String categoryCondition = "";
    Object[] queryParams;

    if (noCategoryFilter) {
        queryParams = new Object[]{
                lon, lat, radiusM,
                limit
        };
    } else {
        Array catArray;
        try (Connection c = dataSource.getConnection()) {
            catArray = c.createArrayOf("text", categories.toArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to create SQL array for categories", e);
        }

        categoryCondition = "and category = any(?)";
        queryParams = new Object[]{
                lon, lat, radiusM,
                catArray,
                limit
        };
    }

    String finalSql = String.format(sqlTemplate, categoryCondition);

    log.warn("[fetchPins:DIST_ONLY] lon={}, lat={}, radiusM={}, categories={}, limit={}",
            lon, lat, radiusM, categories, limit);

    return jdbc.query(
            finalSql,
            (rs, rowNum) -> new EventPin(
                    UUID.fromString(rs.getString("id")),
                    rs.getString("title"),
                    rs.getString("category"),
                    rs.getObject("start_time", OffsetDateTime.class),
                    rs.getObject("expires_at", OffsetDateTime.class),
                    rs.getString("owner"),
                    rs.getDouble("lat"),
                    rs.getDouble("lon"),
                    rs.getString("description"),
                    rs.getString("image_path")
            ),
            queryParams
    );
}





    public EventPin fetchEventById(UUID id) {
        String sql = """
            select
              id,
              title,
              category,
              start_time,
              expires_at,
              owner,
              st_y(location::geometry) as lat,
              st_x(location::geometry) as lon,
              description,
              image_path
            from events
            where id = ?
            limit 1;
        """;

        List<EventPin> results = jdbc.query(
                sql,
                (rs, rowNum) -> new EventPin(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("category"),
                        rs.getObject("start_time", OffsetDateTime.class),
                        rs.getObject("expires_at", OffsetDateTime.class),
                        rs.getString("owner"),
                        rs.getDouble("lat"),
                        rs.getDouble("lon"),
                        rs.getString("description"),
                        rs.getString("image_path")
                ),
                id
        );

        return results.isEmpty() ? null : results.get(0);
    }

    public List<EventPin> fetchEventsByOwner(String owner, int limit) {
        String sql = """
            select
              id,
              title,
              category,
              start_time,
              expires_at,
              owner,
              st_y(location::geometry) as lat,
              st_x(location::geometry) as lon,
              description,
              image_path
            from events
            where owner = ?
            order by start_time asc
            limit ?;
        """;

        List<EventPin> results = jdbc.query(
                sql,
                (rs, rowNum) -> new EventPin(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("category"),
                        rs.getObject("start_time", OffsetDateTime.class),
                        rs.getObject("expires_at", OffsetDateTime.class),
                        rs.getString("owner"),
                        rs.getDouble("lat"),
                        rs.getDouble("lon"),
                        rs.getString("description"),
                        rs.getString("image_path")
                ),
                owner, limit
        );

        return results;
    }

    public List<EventPin> fetchPinsWithCursor(
            double lon,
            double lat,
            int radiusM,
            OffsetDateTime timeStart,
            OffsetDateTime timeEnd,
            List<String> categories,
            String cursor,
            int limit
    ) {
        boolean noCategoryFilter = (categories == null || categories.isEmpty());
        Array catArray = null;
        boolean hasCursor = cursor != null && !cursor.isEmpty();
        UUID cursorId = null;

        if (hasCursor) {
            try {
                cursorId = UUID.fromString(cursor);
            } catch (IllegalArgumentException e) {
                hasCursor = false;
            }
        }

        // Build SQL dynamically
        StringBuilder sql = new StringBuilder("""
            select
              id,
              title,
              category,
              start_time,
              expires_at,
              owner,
              st_y(location::geometry) as lat,
              st_x(location::geometry) as lon,
              description,
              image_path
            from events
            where expires_at > now()
              and st_dwithin(
                location,
                st_setsrid(st_makepoint(?, ?), 4326)::geography,
                ?
              )
              and start_time <= ?
              and expires_at >= ?
        """);

        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(lon);
        params.add(lat);
        params.add(radiusM);
        params.add(timeEnd);
        params.add(timeStart);

        if (!noCategoryFilter) {
            try (Connection c = dataSource.getConnection()) {
                catArray = c.createArrayOf("text", categories.toArray());
            } catch (Exception e) {
                throw new RuntimeException("Failed to create SQL array for categories", e);
            }
            sql.append(" and category = any(?)");
            params.add(catArray);
        }

        if (hasCursor) {
            sql.append(" and (start_time, id) > (select start_time, id from events where id = ?)");
            params.add(cursorId);
        }

        sql.append(" order by start_time asc, id asc limit ?");
        params.add(limit);

        List<EventPin> results = jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new EventPin(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("category"),
                        rs.getObject("start_time", OffsetDateTime.class),
                        rs.getObject("expires_at", OffsetDateTime.class),
                        rs.getString("owner"),
                        rs.getDouble("lat"),
                        rs.getDouble("lon"),
                        rs.getString("description"),
                        rs.getString("image_path")
                ),
                params.toArray()
        );

        return results;
    }

    public UUID createEvent(
            String title,
            String category,
            double lat,
            double lon,
            OffsetDateTime startTime,
            OffsetDateTime expiresAt,
            String owner,
            String description,
            String imagePath
    ) {
        UUID eventId = UUID.randomUUID();
        String sql = """
            insert into events (id, title, category, location, start_time, expires_at, owner, description, image_path)
            values (?, ?, ?, st_setsrid(st_makepoint(?, ?), 4326)::geography, ?, ?, ?, ?, ?)
        """;

        jdbc.update(sql, eventId, title, category, lon, lat, startTime, expiresAt, owner, description, imagePath);
        return eventId;
    }

    public boolean updateEvent(
            UUID eventId,
            String title,
            String category,
            Double lat,
            Double lon,
            OffsetDateTime startTime,
            OffsetDateTime expiresAt,
            String description,
            String imagePath
    ) {
        // Build dynamic update query
        StringBuilder sql = new StringBuilder("update events set ");
        java.util.List<Object> params = new java.util.ArrayList<>();
        boolean hasUpdate = false;

        if (title != null) {
            sql.append("title = ?, ");
            params.add(title);
            hasUpdate = true;
        }
        if (category != null) {
            sql.append("category = ?, ");
            params.add(category);
            hasUpdate = true;
        }
        if (lat != null && lon != null) {
            sql.append("location = st_setsrid(st_makepoint(?, ?), 4326)::geography, ");
            params.add(lon);
            params.add(lat);
            hasUpdate = true;
        }
        if (startTime != null) {
            sql.append("start_time = ?, ");
            params.add(startTime);
            hasUpdate = true;
        }
        if (expiresAt != null) {
            sql.append("expires_at = ?, ");
            params.add(expiresAt);
            hasUpdate = true;
        }
        if (description != null) {
            sql.append("description = ?, ");
            params.add(description);
            hasUpdate = true;
        }
        if (imagePath != null) {
            sql.append("image_path = ?, ");
            params.add(imagePath);
            hasUpdate = true;
        }

        if (!hasUpdate) {
            return false;
        }

        // Remove trailing comma and space
        sql.setLength(sql.length() - 2);
        sql.append(" where id = ?");
        params.add(eventId);

        int rows = jdbc.update(sql.toString(), params.toArray());
        return rows > 0;
    }

    public boolean deleteEvent(UUID eventId) {
        // Hard delete: permanently remove the event from the database
        String sql = "delete from events where id = ?";
        int rows = jdbc.update(sql, eventId);
        return rows > 0;
    }

    public EventPin fetchEventByIdActive(UUID id) {
        String sql = """
            select
              id,
              title,
              category,
              start_time,
              expires_at,
              owner,
              st_y(location::geometry) as lat,
              st_x(location::geometry) as lon,
              description,
              image_path
            from events
            where id = ? and expires_at > now()
            limit 1;
        """;

        List<EventPin> results = jdbc.query(
                sql,
                (rs, rowNum) -> new EventPin(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("category"),
                        rs.getObject("start_time", OffsetDateTime.class),
                        rs.getObject("expires_at", OffsetDateTime.class),
                        rs.getString("owner"),
                        rs.getDouble("lat"),
                        rs.getDouble("lon"),
                        rs.getString("description"),
                        rs.getString("image_path")
                ),
                id
        );

        return results.isEmpty() ? null : results.get(0);
    }

    public List<EventPin> fetchEventsByOwnerWithStatus(
            String owner,
            String status,
            String cursor,
            int limit
    ) {
        StringBuilder sql = new StringBuilder("""
            select
              id,
              title,
              category,
              start_time,
              expires_at,
              owner,
              st_y(location::geometry) as lat,
              st_x(location::geometry) as lon,
              description,
              image_path
            from events
            where owner = ?
        """);

        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(owner);

        // Add status filter
        String statusLower = status != null ? status.toLowerCase() : "active";
        switch (statusLower) {
            case "active" -> {
                sql.append(" and expires_at > now()");
            }
            case "expired" -> {
                sql.append(" and expires_at <= now()");
            }
            // "all" - no additional condition
        }

        // Add cursor condition
        if (cursor != null && !cursor.isEmpty()) {
            try {
                UUID cursorId = UUID.fromString(cursor);
                sql.append(" and (start_time, id) > (select start_time, id from events where id = ?)");
                params.add(cursorId);
            } catch (IllegalArgumentException e) {
                // Invalid cursor, ignore it
            }
        }

        sql.append(" order by start_time asc, id asc limit ?");
        params.add(limit);

        List<EventPin> results = jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new EventPin(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("category"),
                        rs.getObject("start_time", OffsetDateTime.class),
                        rs.getObject("expires_at", OffsetDateTime.class),
                        rs.getString("owner"),
                        rs.getDouble("lat"),
                        rs.getDouble("lon"),
                        rs.getString("description"),
                        rs.getString("image_path")
                ),
                params.toArray()
        );

        return results;
    }

    public String getOwner(UUID eventId) {
        String sql = "select owner from events where id = ?";
        try {
            return jdbc.queryForObject(sql, String.class, eventId);
        } catch (Exception e) {
            return null;
        }
    }
}