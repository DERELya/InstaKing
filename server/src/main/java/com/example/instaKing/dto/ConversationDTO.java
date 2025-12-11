package com.example.instaKing.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ConversationDTO {
        private Long id;
        private List<UserDTO> participants;
        private String previewMessage;
        private LocalDateTime lastMessageAt;
        private int unreadCount;
        private String title;
}
