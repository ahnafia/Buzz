package com.example.demo.Models;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FlagLike(
        UUID id,
        UUID flagId,
        UUID userId,
        OffsetDateTime createdAt
) {
}