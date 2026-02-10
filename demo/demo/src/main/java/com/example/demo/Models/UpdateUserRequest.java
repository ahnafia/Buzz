package com.example.demo.Models;

public record UpdateUserRequest(
        String displayName,         // optional
        String bio,                 // optional
        String profileImageUrl,     // optional
        Double lat,                 // optional - update location
        Double lon,                 // optional
        String city,                // optional
        String addressText,         // optional - human-readable address
        String businessName,        // optional
        String businessCategory,    // optional
        Boolean locationVisible,    // optional - privacy setting
        Boolean profilePublic       // optional - privacy setting
) {
}
