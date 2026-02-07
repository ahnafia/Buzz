package com.example.demo.Models;

public record CreateFlagRequest(
        String title,
        String description,
        double lat,
        double lon,
        String category,
        String imageUrl,
        Boolean isPublic
) {
}