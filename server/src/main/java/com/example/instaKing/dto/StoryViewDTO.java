package com.example.instaKing.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StoryViewDTO {
    private String username;
    private LocalDateTime viewedAt;


    public StoryViewDTO(String username, LocalDateTime viewedAt) {
        this.username = username;
        this.viewedAt = viewedAt;
    }
}
