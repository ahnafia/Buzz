package com.example.demo.Models;

public record UpdateLandmarkRequest(
        String name,
        String description,
        String city,
        String addressText,  // Human-readable address for display
        String category,
        Boolean incrementVisit
) {
}