package com.example.instaKing.dto;

import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.MessageStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageDTO {
    private Long id;
    private String message;
    private LocalDateTime createdAt;
    private String Author;
    private String username;
    private MessageStatus status = MessageStatus.SENT;
}
