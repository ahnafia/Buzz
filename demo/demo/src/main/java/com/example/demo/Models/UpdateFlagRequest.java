package com.example.demo.Models;

public record UpdateFlagRequest(
        String title,
        String description,
        String city,
        String addressText,  // Human-readable address for display
        String category,
        String imageUrl,
        Boolean isPublic
) {
}