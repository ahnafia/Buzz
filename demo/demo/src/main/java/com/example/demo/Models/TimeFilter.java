package com.example.demo.Models;

public enum TimeFilter {
    NOW, TONIGHT, WEEK;

    public static TimeFilter from(String s) {
        if (s == null) return WEEK;
        return switch (s.trim().toLowerCase()) {
            case "now" -> NOW;
            case "tonight" -> TONIGHT;
            case "week", "thisweek", "this_week" -> WEEK;
            default -> WEEK;
        };
    }
}