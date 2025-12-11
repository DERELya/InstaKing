package com.example.instaKing.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypingDTO {

    private Long conversationId;

    private String username;

    private boolean isTyping;
}
