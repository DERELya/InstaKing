package com.example.instaKing.services;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.TypingDTO;
import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.MessageStatus;
import com.example.instaKing.repositories.ConversationRepository;
import com.example.instaKing.repositories.MessageRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final long PRIVATE_CHAT_COUNT = 2;

    @Autowired
    public ChatService(ConversationRepository conversationRepository, MessageRepository messageRepository, UserService userService, SimpMessagingTemplate simpMessagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userService = userService;
        this.messagingTemplate = simpMessagingTemplate;
    }

    @Transactional
    public Conversation getOrCreatePrivateConversation(Long userAId, Long userBId) {
        List<Long> participantsIds = List.of(userAId, userBId);

        Optional<Conversation> existingConversation =
                conversationRepository.findConversationByParticipantsIdsAndCount(participantsIds, PRIVATE_CHAT_COUNT);

        if (existingConversation.isPresent()) {
            return existingConversation.get();
        }

        User userA = userService.getUserById(userAId);
        User userB = userService.getUserById(userBId);

        Conversation newConversation = new Conversation();
        newConversation.setParticipants(List.of(userA, userB));
        newConversation.setLastMessageAt(LocalDateTime.now());

        return conversationRepository.save(newConversation);
    }

    @Transactional
    public Message saveAndSend(MessageDTO messageDto) {

        User sender = userService.getUserById(messageDto.getSenderId());
        Conversation conversation = conversationRepository.findById(messageDto.getConversationId())
                .orElseThrow(() -> new EntityNotFoundException("Диалог не найден с ID: " + messageDto.getConversationId()));

        Message newMessage = new Message();
        newMessage.setContent(messageDto.getContent());
        newMessage.setSender(sender);
        newMessage.setConversation(conversation);
        newMessage.setStatus(MessageStatus.SENT);

        Message savedMessage = messageRepository.save(newMessage);


        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        conversationRepository.save(conversation);

        sendRealTimeNotification(savedMessage, conversation);

        return savedMessage;
    }

    private void sendRealTimeNotification(Message message, Conversation conversation) {
        for (User participant : conversation.getParticipants()) {
            String destination = "/queue/messages";
            messagingTemplate.convertAndSendToUser(
                    participant.getUsername(),
                    destination,
                    message
            );
        }
    }

    public List<Message> getMessageHistory(Long conversationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
    }

    @Transactional
    public void markConversationAsRead(Long conversationId, Long readerId) {
        messageRepository.markMessagesAsReadInConversation(conversationId, readerId);
    }

    public void sendTypingNotification(TypingDTO typingDto, String senderUsername) {

        Conversation conversation = conversationRepository.findById(typingDto.getConversationId())
                .orElse(null);

        if (conversation == null) {
            System.err.println("Диалог не найден для уведомления о печати: " + typingDto.getConversationId());
            return;
        }

        for (User participant : conversation.getParticipants()) {

            if (participant.getUsername().equals(senderUsername)) {
                continue;
            }
            typingDto.setUsername(senderUsername);
            String destination = "/queue/typing";
            messagingTemplate.convertAndSendToUser(
                    participant.getUsername(),
                    destination,
                    typingDto
            );
        }
    }

    public List<Conversation> getConversationByUser(Long id) {
        return conversationRepository.findConversationsByParticipantId(id);
    }

    public String getLastMessageContent(Long conversationId) {
        // Ищем одно последнее сообщение
        // Предполагается, что у вас есть метод в MessageRepository, который возвращает
        // последнее сообщение, например:
        // return messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversationId);

        return "Нет сообщений"; // Заглушка
    }
    public int getUnreadMessageCount(Long conversationId, Long currentUserId) {
        // Предполагается, что у вас есть кастомный запрос в MessageRepository
        // (например, найти COUNT сообщений, где status='SENT' и sender.id != currentUserId)

        // ВАЖНО: Вы должны определить в MessageRepository этот запрос.

        // Пример (нужно реализовать):
        // return messageRepository.countUnreadMessages(conversationId, currentUserId);

        return 0; // Заглушка
    }
}

