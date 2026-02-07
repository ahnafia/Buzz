package com.example.demo.Models;

public record UpdateLandmarkRequest(
        String name,
        String description,
        String category,
        Boolean incrementVisit
) {
}