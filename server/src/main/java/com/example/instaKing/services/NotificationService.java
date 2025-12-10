package com.example.instaKing.services;

import com.example.instaKing.dto.NotificationDTO;
import com.example.instaKing.models.Notification;
import com.example.instaKing.repositories.NotificationRepository;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private NotificationRepository notificationRepository;
    private SimpMessagingTemplate messagingTemplate;
    private UserRepository userRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository, SimpMessagingTemplate messagingTemplate, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    public Notification save(NotificationDTO notification) {
        Notification notificationEntity = new Notification();
        notificationEntity.setContent(notification.getContent());
        notificationEntity.setCreatedAt(notification.getCreatedAt());
        notificationEntity.setRead(false);
        notificationEntity.setSender(userRepository.getUserByUsername(notification.getSender()));
        notificationEntity.setRecipient(userRepository.getUserByUsername(notification.getRecipient()));
        return notificationRepository.save(notificationEntity);
    }

    public void sendRealTimeNotification(Notification notification) {

        messagingTemplate.convertAndSendToUser(
                notification.getRecipient().getUsername(),
                "/queue/notifications",
                notification
        );
    }
}
