package com.example.demo.Models;

public enum UserType {
    PERSONAL,       // Regular users
    BUSINESS,       // Clubs, restaurants, venues
    PROMOTER,       // Event promoters
    ARTIST;         // Artists, performers

    public static UserType from(String s) {
        if (s == null) return PERSONAL;
        return switch (s.trim().toUpperCase()) {
            case "BUSINESS" -> BUSINESS;
            case "PROMOTER" -> PROMOTER;
            case "ARTIST" -> ARTIST;
            default -> PERSONAL;
        };
    }
}
