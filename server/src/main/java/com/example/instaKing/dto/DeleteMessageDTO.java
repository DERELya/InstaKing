package com.example.instaKing.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DeleteMessageDTO {
    private Long messageId;
    private Long conversationId;
}
