package com.example.demo.Models;

public record FlagWithLikeCount(
        Flag flag,
        int likeCount,
        boolean likedByCurrentUser
) {
}