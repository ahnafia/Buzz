package com.example.demo.Models;

public record UpdateUserRequest(
        String displayName,         // optional
        String bio,                 // optional
        String profileImagePath,    // optional - path in Supabase storage (e.g., "profiles/167501_00_2x.jpg")
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
