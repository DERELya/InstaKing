package com.example.instaKing.dto;

import lombok.Data;

@Data
public class MessageDTO {
    private Long id;
    private String content;
    private Long senderId;
    private Long conversationId;
    private Long recipientId;
}
