package com.example.instaKing.dto;

import com.example.instaKing.models.enums.StoryVisibility;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class StoryDTO {

    private Long id;
    private String username;
    private String mediaUrl;

    private int views;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private Map<String, LocalDateTime> usersViewed;
    private boolean viewed;
    private String description;
    private StoryVisibility visibility = StoryVisibility.PUBLIC;
    private MultipartFile file;
    private String userAvatarUrl;


}
