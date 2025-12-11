package com.example.instaKing.facade;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.models.Message;
import org.springframework.stereotype.Component;

@Component
public class MessageMapper {
    public static MessageDTO toDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setContent(message.getContent());
        dto.setSenderId(message.getSender().getId());
        dto.setConversationId(message.getConversation().getId());

        return dto;
    }

}
