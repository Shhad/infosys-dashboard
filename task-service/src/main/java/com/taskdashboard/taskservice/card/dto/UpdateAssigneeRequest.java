package com.taskdashboard.taskservice.card.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * {@code assignee_id} may be null to unassign.
 */
public record UpdateAssigneeRequest(@JsonProperty("assignee_id") UUID assigneeId) {
}
