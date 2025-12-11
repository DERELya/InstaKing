package com.example.instaKing.controllers;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.TypingDTO;
import com.example.instaKing.models.Message;
import com.example.instaKing.services.ChatService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    private final ChatService chatService;

    @Autowired
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/chat/sendMessage")
    public void sendMessage(@Payload MessageDTO messageDto, Principal principal) {
        //Long senderId = principal.getName();
        try {
            Message savedMessage = chatService.saveAndSend(messageDto);
        } catch (EntityNotFoundException e) {
            System.err.println("Ошибка при отправке: " + e.getMessage());
        }
    }

    @MessageMapping("/chat/typing")
    public void handleTypingNotification(@Payload TypingDTO typingDto, Principal principal) {
        String senderUsername = principal.getName();
        chatService.sendTypingNotification(typingDto, senderUsername);
    }
}
