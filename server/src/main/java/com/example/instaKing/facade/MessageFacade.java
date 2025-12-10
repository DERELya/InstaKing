package com.example.instaKing.facade;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.models.Message;
import org.hibernate.annotations.Comment;
import org.springframework.stereotype.Component;

@Component
public class MessageFacade {
    public MessageDTO messageToMessageDTO(Message message) {
        MessageDTO messageDTO = new MessageDTO();
        messageDTO.setMessage(message.getMessage());
        messageDTO.setId(message.getId());
        messageDTO.setAuthor(message.getSender());
        messageDTO.setUsername(message.getReceiver());
        messageDTO.setStatus(message.getStatus());
        messageDTO.setCreatedAt(message.getCreatedAt());
        return messageDTO;
    }
}
