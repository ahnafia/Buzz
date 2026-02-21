package com.example.demo.Controllers;

import com.example.demo.Models.*;
import com.example.demo.Service.FlagService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/flags")
@CrossOrigin(origins = "http://localhost:5173")
public class FlagController {
    private final FlagService service;

    public FlagController(FlagService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Flag> createFlag(
            @RequestBody CreateFlagRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        System.out.println("🚀 createFlag endpoint called");
        System.out.println("📋 Request: " + request);
        System.out.println("👤 User ID Header: " + userIdHeader);
        
        if (userIdHeader == null || userIdHeader.isBlank()) {
            System.out.println("❌ No user ID header provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID userId = UUID.fromString(userIdHeader);
            System.out.println("✅ Parsed user ID: " + userId);
            
            System.out.println("🔄 Calling service.createFlag...");
            Flag flag = service.createFlag(request, userId);
            System.out.println("✅ Flag created successfully: " + flag);
            return ResponseEntity.status(HttpStatus.CREATED).body(flag);
        } catch (IllegalArgumentException e) {
            System.out.println("❌ IllegalArgumentException: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (org.springframework.dao.DataAccessException e) {
            System.out.println("❌ Database error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        } catch (Exception e) {
            System.out.println("❌ Unexpected exception: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/{flagId}")
    public ResponseEntity<Flag> getFlag(@PathVariable String flagId) {
        try {
            UUID id = UUID.fromString(flagId);
            Flag flag = service.getFlagById(id);
            return flag != null ? ResponseEntity.ok(flag) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Flag>> getUserFlags(
            @PathVariable String userId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        try {
            UUID id = UUID.fromString(userId);
            List<Flag> flags = service.getUserFlags(id, limit);
            return ResponseEntity.ok(flags);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<Flag>> getFlagsNearby(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "5.0") double radiusMiles,
            @RequestParam(defaultValue = "50") int limit
    ) {
        List<Flag> flags = service.getFlagsNearby(lat, lon, radiusMiles, limit);
        return ResponseEntity.ok(flags);
    }

    @PatchMapping("/{flagId}")
    public ResponseEntity<Flag> updateFlag(
            @PathVariable String flagId,
            @RequestBody UpdateFlagRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID id = UUID.fromString(flagId);
            Flag updated = service.updateFlag(id, request);
            return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{flagId}")
    public ResponseEntity<Void> deleteFlag(
            @PathVariable String flagId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID id = UUID.fromString(flagId);
            boolean deleted = service.deleteFlag(id);
            return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{flagId}/like")
    public ResponseEntity<?> likeFlag(
            @PathVariable String flagId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID flagUuid = UUID.fromString(flagId);
            UUID userUuid = UUID.fromString(userIdHeader);
            service.likeFlag(flagUuid, userUuid);
            return ResponseEntity.ok(Map.of("message", "Flag liked"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{flagId}/like")
    public ResponseEntity<?> unlikeFlag(
            @PathVariable String flagId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID flagUuid = UUID.fromString(flagId);
            UUID userUuid = UUID.fromString(userIdHeader);
            boolean unlike = service.unlikeFlag(flagUuid, userUuid);
            return unlike ? ResponseEntity.ok(Map.of("message", "Flag unliked")) 
                         : ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{flagId}/like-count")
    public ResponseEntity<Map<String, Integer>> getLikeCount(@PathVariable String flagId) {
        try {
            UUID id = UUID.fromString(flagId);
            int count = service.getLikeCount(id);
            return ResponseEntity.ok(Map.of("likeCount", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== LIKES (CURRENT USER) ====================

@GetMapping("/me/likes")
public ResponseEntity<List<Flag>> getMyLikedFlags(
        @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
        @RequestParam(defaultValue = "50") int limit
) {
    if (userIdHeader == null || userIdHeader.isBlank()) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
        UUID userId = UUID.fromString(userIdHeader);
        List<Flag> flags = service.getFlagsLikedByUser(userId, limit);
        return ResponseEntity.ok(flags);
    } catch (Exception e) {
        return ResponseEntity.badRequest().build();
    }
}

@GetMapping("/me/likes/count")
public ResponseEntity<Map<String, Integer>> getMyLikesGivenCount(
        @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
) {
    if (userIdHeader == null || userIdHeader.isBlank()) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
        UUID userId = UUID.fromString(userIdHeader);
        int count = service.getLikesGivenCount(userId);
        return ResponseEntity.ok(Map.of("likesGiven", count));
    } catch (Exception e) {
        return ResponseEntity.badRequest().build();
    }
}

}