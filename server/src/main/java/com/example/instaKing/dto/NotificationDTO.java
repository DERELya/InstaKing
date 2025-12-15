package com.example.instaKing.dto;


import com.example.instaKing.models.enums.NotificationType;
import lombok.Data;


import java.time.LocalDateTime;

@Data
public class NotificationDTO {
    private Long id;
    private String content;
    private NotificationType type;
    private boolean isRead;
    private LocalDateTime createdAt;


    private Long senderId;
    private String senderUsername;
    private String senderAvatarUrl;
}
