package com.taskdashboard.taskservice.card.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.taskdashboard.taskservice.card.Card;
import com.taskdashboard.taskservice.card.Status;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Exact wire shape (SPEC §5.2):
 * { id, title, description, status, creator_id, assignee_id, created_at, updated_at }.
 */
public record CardResponse(
        UUID id,
        String title,
        String description,
        Status status,
        @JsonProperty("creator_id") UUID creatorId,
        @JsonProperty("assignee_id") UUID assigneeId,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("updated_at") OffsetDateTime updatedAt) {

    public static CardResponse from(Card card) {
        return new CardResponse(
                card.getId(),
                card.getTitle(),
                card.getDescription(),
                card.getStatus(),
                card.getCreatorId(),
                card.getAssigneeId(),
                card.getCreatedAt(),
                card.getUpdatedAt());
    }
}
