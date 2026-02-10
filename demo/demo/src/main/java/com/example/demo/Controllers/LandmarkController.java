package com.example.demo.Controllers;

import com.example.demo.Models.*;
import com.example.demo.Service.LandmarkService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/landmarks")
@CrossOrigin(origins = "http://localhost:5173")
public class LandmarkController {
    private final LandmarkService service;

    public LandmarkController(LandmarkService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Landmark> createLandmark(
            @RequestBody CreateLandmarkRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID userId = UUID.fromString(userIdHeader);
            Landmark landmark = service.createLandmark(request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(landmark);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{landmarkId}")
    public ResponseEntity<Landmark> getLandmark(@PathVariable String landmarkId) {
        try {
            UUID id = UUID.fromString(landmarkId);
            Landmark landmark = service.getLandmarkById(id);
            return landmark != null ? ResponseEntity.ok(landmark) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Landmark>> getUserLandmarks(
            @PathVariable String userId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        try {
            UUID id = UUID.fromString(userId);
            List<Landmark> landmarks = service.getUserLandmarks(id, limit);
            return ResponseEntity.ok(landmarks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{landmarkId}")
    public ResponseEntity<Landmark> updateLandmark(
            @PathVariable String landmarkId,
            @RequestBody UpdateLandmarkRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID id = UUID.fromString(landmarkId);
            Landmark updated = service.updateLandmark(id, request);
            return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{landmarkId}")
    public ResponseEntity<Void> deleteLandmark(
            @PathVariable String landmarkId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader
    ) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            UUID id = UUID.fromString(landmarkId);
            boolean deleted = service.deleteLandmark(id);
            return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}