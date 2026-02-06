package com.example.demo.Models;

public record CreateUserRequest(
        String username,
        String email,
        String password,
        String displayName,
        String userType,    // PERSONAL, BUSINESS, PROMOTER, ARTIST
        // Optional business fields
        String businessName,
        String businessCategory
) {
}
