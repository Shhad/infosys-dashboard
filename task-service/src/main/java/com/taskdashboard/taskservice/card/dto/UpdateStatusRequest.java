package com.taskdashboard.taskservice.card.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Status is received as a raw string and validated against the enum in the
 * service so an out-of-enum value yields a clean {@code 400} (AC-11).
 */
public record UpdateStatusRequest(@NotNull(message = "is required") String status) {
}
