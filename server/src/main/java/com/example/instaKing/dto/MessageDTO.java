package com.example.instaKing.dto;

import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.MessageStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageDTO {
    private String content;
    private Long senderId;
    private Long conversationId;
}
