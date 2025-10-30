package com.example.instaKing.dto;

import com.example.instaKing.models.Story;
import com.example.instaKing.models.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Data
public class StoryDTO {

    private Long id;
    private String username;
    private String mediaUrl;

    private int views;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private Map<String,LocalDateTime> usersViewed;
    private boolean viewed;

}
