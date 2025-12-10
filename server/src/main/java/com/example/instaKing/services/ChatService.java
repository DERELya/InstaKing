package com.example.instaKing.services;

import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import com.example.instaKing.repositories.ConversationRepository;
import com.example.instaKing.repositories.MessageRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public ChatService(ConversationRepository conversationRepository, MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    public Conversation getOrCreateConversation(String sender, String receiver) {
        return conversationRepository.findByParticipantAAndParticipantB(sender, receiver)
                .or(() -> conversationRepository.findByParticipantBAndParticipantA(sender, receiver))
                .orElseGet(() -> {
                    Conversation conversation = new Conversation();
                    conversation.setParticipantA(sender);
                    conversation.setParticipantB(receiver);
                    return conversationRepository.save(conversation);
                });
    }

    public Message saveMessage(Message message) {
        Conversation conversation = getOrCreateConversation(message.getSender(), message.getReceiver());
        message.setConversation(conversation);
        return messageRepository.save(message);
    }

    public List<Message> getConversationHistory(String sender, String receiver) {
        Conversation conversation = getOrCreateConversation(sender, receiver);
        return messageRepository.findByConversationOrderByCreatedAtAsc(conversation);
    }
}

