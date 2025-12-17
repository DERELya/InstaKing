package com.example.instaKing.services;

import com.example.instaKing.dto.NotificationDTO;
import com.example.instaKing.facade.NotificationFacade;
import com.example.instaKing.models.Notification;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.NotificationType;
import com.example.instaKing.repositories.NotificationRepository;
import com.example.instaKing.repositories.UserRepository;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;


@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final NotificationFacade notificationFacade;
    @Autowired
    public NotificationService(NotificationRepository notificationRepository, SimpMessagingTemplate messagingTemplate, UserRepository userRepository, NotificationFacade notificationFacade) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
        this.notificationFacade = notificationFacade;
    }

    @Transactional
    public void createNotification(User recipient, User sender, NotificationType type, String content) {
        if (recipient.getId().equals(sender.getId())) {
            return;
        }

        // 2. Создаем и сохраняем в БД
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setSender(sender);
        notification.setType(type);
        notification.setContent(content);

        Notification saved = notificationRepository.save(notification);

        // 3. Конвертируем в DTO
        NotificationDTO dto = notificationFacade.toDTO(saved);

        // 4. Отправляем в WebSocket (в личную очередь получателя)
        // Клиент подпишется на: /user/queue/notifications
        messagingTemplate.convertAndSendToUser(
                recipient.getUsername(),
                "/queue/notifications",
                dto
        );
    }

    public List<NotificationDTO> getUserNotifications(User recipient) {
        return notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(recipient.getId())
                .stream().map(notificationFacade::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }


    private NotificationDTO convertToDto(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(n.getId());
        dto.setContent(n.getContent());
        dto.setType(n.getType());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setSenderId(n.getSender().getId());
        dto.setSenderUsername(n.getSender().getUsername());
        return dto;
    }

    public void markAllAsReadForUser(User recipient) {
        List<Notification> unread = notificationRepository.findAllByRecipientIdAndIsReadFalse(recipient.getId());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}
