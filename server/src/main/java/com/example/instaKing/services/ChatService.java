package com.example.instaKing.services;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.ReadReceiptDTO;
import com.example.instaKing.dto.TypingDTO;
import com.example.instaKing.facade.MessageMapper;
import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.MessageStatus;
import com.example.instaKing.repositories.ConversationRepository;
import com.example.instaKing.repositories.MessageRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       UserService userService,
                       SimpMessagingTemplate simpMessagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userService = userService;
        this.messagingTemplate = simpMessagingTemplate;
    }

    /**
     * Получает существующий приватный чат или создает новый между двумя пользователями.
     */
    @Transactional
    public Conversation getOrCreatePrivateConversation(Long userAId, Long userBId) {
        List<Long> participantsIds = List.of(userAId, userBId);

        Optional<Conversation> existingConversation =
                conversationRepository.findConversationByParticipantsAndCount(participantsIds, PRIVATE_CHAT_COUNT);

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

    /**
     * Сохраняет сообщение в БД и рассылает его через WebSocket всем участникам.
     */
    @Transactional
    public Message saveAndSend(MessageDTO messageDto) {
        Conversation conversation;
        //диалога нет
        if (messageDto.getConversationId() == null) {
            if (messageDto.getRecipientId() == null) {
                throw new IllegalArgumentException("Для нового чата нужен recipientId");
            }

            conversation = getOrCreatePrivateConversation(messageDto.getSenderId(), messageDto.getRecipientId());
        }
        //диалог есть
        else {
            conversation = conversationRepository.findById(messageDto.getConversationId())
                    .orElseThrow(() -> new EntityNotFoundException("Диалог не найден"));
        }

        boolean isParticipant = conversation.getParticipants().stream()
                .anyMatch(u -> u.getId().equals(messageDto.getSenderId()));

        if (!isParticipant) {
            throw new SecurityException("Вы не являетесь участником этого диалога!");
        }


        User sender = userService.getUserById(messageDto.getSenderId());

        Message newMessage = new Message();
        newMessage.setContent(messageDto.getContent());
        newMessage.setSender(sender);
        newMessage.setConversation(conversation);
        newMessage.setCreatedAt(LocalDateTime.now());
        newMessage.setStatus(MessageStatus.SENT);

        Message savedMessage = messageRepository.save(newMessage);

        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        conversationRepository.save(conversation);

        sendRealTimeNotification(savedMessage, conversation);

        return savedMessage;
    }

    /**
     * Рассылает сообщение всем участникам диалога.
     */
    private void sendRealTimeNotification(Message savedMessage, Conversation conversation) {
        // Преобразуем Entity в DTO для отправки на фронт
        MessageDTO responseDto = convertToDto(savedMessage);

        // Проходимся по ВСЕМ участникам диалога (и отправителю, и получателю)
        for (User participant : conversation.getParticipants()) {

            // ВАЖНО: SimpMessagingTemplate использует username (строку) для маршрутизации
            String username = participant.getUsername();

            // Отправляем в личную очередь юзера /user/{username}/queue/messages
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/messages",
                    responseDto
            );

            // Логируем для проверки
            System.out.println("Отправлено WS сообщение пользователю: " + username);
        }
    }
    private MessageDTO convertToDto(Message msg) {
        MessageDTO dto = new MessageDTO();
        dto.setContent(msg.getContent());
        dto.setSenderId(msg.getSender().getId());
        dto.setConversationId(msg.getConversation().getId());
        return dto;
    }

    /**
     * Получает историю сообщений с пагинацией.
     */
    public List<Message> getMessageHistory(Long conversationId, int page, int size) {
        // Сортируем DESC (от новых к старым), чтобы взять последние 'size' сообщений.
        // На фронтенде их нужно будет перевернуть (reverse) для правильного порядка.
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return messageRepository.findByConversationId(conversationId, pageable).getContent();
    }

    /**
     * Проверяет, является ли пользователь участником диалога (для безопасности REST).
     */
    public boolean isUserParticipant(Long conversationId, String username) {
        return conversationRepository.findById(conversationId)
                .map(c -> c.getParticipants().stream()
                        .anyMatch(p -> p.getUsername().equals(username)))
                .orElse(false);
    }

    /**
     * Помечает все входящие сообщения в диалоге как прочитанные.
     */
    @Transactional
    public void markConversationAsRead(Long conversationId, Long readerId) {
        // 1. Обновляем в БД
        messageRepository.markMessagesAsReadInConversation(conversationId, readerId);

        // 2. Уведомляем собеседника, что его сообщения прочитали
        Conversation conversation = conversationRepository.findById(conversationId).get();

        // Находим собеседника (того, КТО писал сообщения, которые мы сейчас прочитали)
        User otherUser = conversation.getParticipants().stream()
                .filter(u -> !u.getId().equals(readerId))
                .findFirst()
                .orElse(null);

        if (otherUser != null) {
            messagingTemplate.convertAndSendToUser(
                    otherUser.getUsername(),
                    "/queue/read-receipt", // Фронт должен слушать этот канал
                    new ReadReceiptDTO(conversationId, readerId) // DTO с ID диалога
            );
        }
    }

    /**
     * Отправляет статус "печатает..." всем участникам, кроме самого отправителя.
     */
    public void sendTypingNotification(TypingDTO typingDto, String senderUsername) {
        Conversation conversation = conversationRepository.findById(typingDto.getConversationId())
                .orElseThrow(() -> new EntityNotFoundException("Диалог не найден"));

        for (User participant : conversation.getParticipants()) {
            if (participant.getUsername().equals(senderUsername)) {
                continue;
            }
            typingDto.setUsername(senderUsername);
            messagingTemplate.convertAndSendToUser(
                    participant.getUsername(),
                    "/queue/typing",
                    typingDto
            );
        }
    }

    public List<Conversation> getConversationByUser(Long id) {
        return conversationRepository.findConversationsByParticipantId(id);
    }

    /**
     * Возвращает текст последнего сообщения для превью в списке чатов.
     */
    public String getLastMessageContent(Long conversationId) {
        return messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversationId)
                .map(Message::getContent)
                .orElse("Нет сообщений");
    }

    /**
     * Считает количество непрочитанных сообщений для текущего пользователя.
     */
    public int getUnreadMessageCount(Long conversationId, Long currentUserId) {
        return messageRepository.countUnreadMessages(conversationId, currentUserId);
    }
}