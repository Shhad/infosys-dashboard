package com.taskdashboard.taskservice.security;

import java.util.UUID;

/**
 * The authenticated caller, derived from the validated JWT claims
 * {@code sub} and {@code role}.
 */
public record UserPrincipal(UUID id, String role) {

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }
}
