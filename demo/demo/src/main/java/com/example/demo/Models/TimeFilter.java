package com.example.demo.Models;

public enum TimeFilter {
    NOW,
    TODAY,
    THIS_WEEK,
    THIS_MONTH,
    ALL;

    public static TimeFilter from(String value) {
        if (value == null || value.isEmpty()) {
            return NOW;
        }
        
        try {
            return TimeFilter.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return NOW;
        }
    }
}