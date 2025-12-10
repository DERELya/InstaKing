package com.example.instaKing.controllers;

import com.example.instaKing.models.Message;
import com.example.instaKing.services.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;

    public ChatController(SimpMessagingTemplate messagingTemplate, ChatService chatService) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
    }

    @MessageMapping("/sendMessage")
    public void sendMessage(Message message, Principal principal) {
        // гарантируем, что sender совпадает с авторизованным пользователем
        message.setSender(principal.getName());

        // сохраняем в БД
        Message saved = chatService.saveMessage(message);

        // отправляем только получателю
        messagingTemplate.convertAndSendToUser(
                saved.getReceiver(),
                "/queue/messages",
                saved
        );
    }
}
