package com.taskdashboard.taskservice.card.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * USER: {@code assignee_id} is ignored and forced to self. ADMIN: honored.
 */
public record CreateCardRequest(
        @NotBlank(message = "is required") String title,
        String description,
        @JsonProperty("assignee_id") UUID assigneeId) {
}
