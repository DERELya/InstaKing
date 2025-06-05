package com.example.instaKing.exceptions;


import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public Map<String, Object> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        return Map.of(
                "status", HttpStatus.BAD_REQUEST.value(),
                "error", "DataIntegrityViolationException",
                "message", ex.getMessage(),
                "timestamp", System.currentTimeMillis()
        );
    }
}
