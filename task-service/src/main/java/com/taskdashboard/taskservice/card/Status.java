package com.taskdashboard.taskservice.card;

/**
 * Card status enum (SPEC §3.3). Transitions are unrestricted (any → any);
 * only enum membership is validated.
 */
public enum Status {
    OPEN,
    TODO,
    IN_PROGRESS,
    REVIEW,
    DONE
}
