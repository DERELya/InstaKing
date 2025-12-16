package com.example.instaKing.controllers;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.TypingDTO;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.User;
import com.example.instaKing.services.ChatService;
import com.example.instaKing.services.UserService;
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
    private final UserService userService;

    @Autowired
    public ChatController(ChatService chatService, UserService userService) {
        this.chatService = chatService;
        this.userService= userService;
    }

    @MessageMapping("/chat/sendMessage")
    public void sendMessage(@Payload MessageDTO messageDto, Principal principal) {
        try {
            String senderUsername = principal.getName();
            User sender=userService.getUserByUsername(senderUsername);
            messageDto.setSenderId(sender.getId());
            chatService.saveAndSend(messageDto);

        } catch (EntityNotFoundException e) {
            System.err.println("Ошибка при отправке: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Системная ошибка: " + e.getMessage());
        }
    }

    @MessageMapping("/chat/typing")
    public void handleTypingNotification(@Payload TypingDTO typingDto, java.security.Principal principal) {
        if (principal == null) {
            return;
        }
        String senderUsername = principal.getName();
        chatService.sendTypingNotification(typingDto, senderUsername);
    }

}
