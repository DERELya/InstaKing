package com.example.instaKing.dto;


import com.example.instaKing.models.enums.NotificationType;
import lombok.Data;


import java.time.LocalDateTime;

@Data
public class NotificationDTO {

    private Long id;
    private String recipient;
    private String sender;
    private NotificationType type;
    private boolean isRead = false;
    private String content;
    private LocalDateTime createdAt;
}
