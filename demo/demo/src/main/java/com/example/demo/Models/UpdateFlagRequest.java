package com.example.demo.Models;

public record UpdateFlagRequest(
        String title,
        String description,
        String category,
        String imageUrl,
        Boolean isPublic
) {
}