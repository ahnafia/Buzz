package com.example.demo.Models;

public record CreateLandmarkRequest(
        String name,
        String description,
        double lat,
        double lon,
        String category
) {
}