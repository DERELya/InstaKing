package com.example.instaKing.dto;

import com.example.instaKing.models.Story;
import com.example.instaKing.models.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

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
