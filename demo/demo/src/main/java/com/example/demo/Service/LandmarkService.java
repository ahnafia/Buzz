package com.example.demo.Service;

import com.example.demo.Models.*;
import com.example.demo.Repositories.LandmarkRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class LandmarkService {
    private final LandmarkRepository repo;
    private static final int MAX_LIMIT = 100;

    public LandmarkService(LandmarkRepository repo) {
        this.repo = repo;
    }

    public Landmark createLandmark(CreateLandmarkRequest request, UUID userId) {
        UUID landmarkId = repo.createLandmark(
                userId,
                request.name(),
                request.description(),
                request.lat(),
                request.lon(),
                request.category()
        );
        return repo.fetchLandmarkById(landmarkId);
    }

    public Landmark getLandmarkById(UUID id) {
        return repo.fetchLandmarkById(id);
    }

    public List<Landmark> getUserLandmarks(UUID userId, int limit) {
        int clampedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        return repo.fetchLandmarksByUser(userId, clampedLimit);
    }

    public Landmark updateLandmark(UUID landmarkId, UpdateLandmarkRequest request) {
        boolean updated = repo.updateLandmark(
                landmarkId,
                request.name(),
                request.description(),
                request.category()
        );

        if (request.incrementVisit() != null && request.incrementVisit()) {
            repo.incrementVisitCount(landmarkId);
        }

        return updated ? repo.fetchLandmarkById(landmarkId) : null;
    }

    public boolean deleteLandmark(UUID landmarkId) {
        return repo.deleteLandmark(landmarkId);
    }

    public int countUserLandmarks(UUID userId) {
        return repo.countUserLandmarks(userId);
    }
}