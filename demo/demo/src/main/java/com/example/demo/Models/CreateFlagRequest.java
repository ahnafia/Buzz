package com.example.demo.Models;

public record CreateFlagRequest(
        String title,
        String description,
        double lat,
        double lon,
        String city,
        String addressText,  // Human-readable address for display
        String category,
        String imageUrl,     // Legacy field for backward compatibility
        String[] imagePaths, // Array of image URLs (preferred)
        Boolean isPublic
) {
}