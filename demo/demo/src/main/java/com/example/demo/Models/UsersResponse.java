package com.example.demo.Models;

import java.util.List;

public record UsersResponse(
        List<UserProfile> users,
        String nextCursor  // null if no more results
) {
}
