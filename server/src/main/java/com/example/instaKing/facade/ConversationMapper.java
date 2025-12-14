package com.example.instaKing.facade;

import com.example.instaKing.dto.ConversationDTO;
import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.MessageRepository;
import com.example.instaKing.services.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ConversationMapper {
    private final MessageRepository messageRepository;

    public ConversationDTO toDto(Conversation conversation, User currentUser) {
        ConversationDTO dto = new ConversationDTO();
        dto.setId(conversation.getId());
        List<UserDTO> participants = conversation.getParticipants()
                .stream()
                .map(UserFacade::userToUserDTO)
                .collect(Collectors.toList());
        dto.setParticipants(participants);
        dto.setTitle(getConversationTitle(conversation, currentUser));
        dto.setLastMessageAt(conversation.getLastMessageAt());
        dto.setUnreadCount(getUnreadMessageCount(conversation.getId(), currentUser.getId()));
        dto.setPreviewMessage(getLastMessageContent(conversation.getId()));

        return dto;
    }

    private int getUnreadMessageCount(Long conversationId, Long currentUserId) {
        // Здесь вызывается метод, который вы определили в MessageRepository
        return (int) messageRepository.countUnreadMessages(conversationId, currentUserId);
    }

    private String getLastMessageContent(Long conversationId) {
        Optional<Message> lastMessage = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversationId);

        return lastMessage.map(Message::getContent) // Если Optional заполнен, берем content
                .orElse("Начните чат");             // Иначе возвращаем заглушку
    }

    // Вспомогательный метод для получения названия чата (очень полезно для фронтенда)
    private String getConversationTitle(Conversation conversation, User currentUser) {
        // Для 1-на-1 чата: возвращаем имя собеседника
        if (conversation.getParticipants().size() == 2) {
            return conversation.getParticipants().stream()
                    .filter(p -> !p.getId().equals(currentUser.getId())) // Найти того, кто не является текущим пользователем
                    .findFirst()
                    .map(User::getUsername)
                    .orElse("Ошибка имени");
        }

        // Для групповых чатов или чатов с именем:
        if (conversation.getChatName() != null && !conversation.getChatName().isEmpty()) {
            return conversation.getChatName();
        }

        return "Чат #" + conversation.getId();
    }
}