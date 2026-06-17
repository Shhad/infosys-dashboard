package com.taskdashboard.taskservice.common;

/**
 * Standardized error envelope shared across all services:
 * { "error": { "code": string, "message": string } }.
 */
public record ErrorResponse(Error error) {

    public record Error(String code, String message) {
    }

    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(new Error(code, message));
    }
}
