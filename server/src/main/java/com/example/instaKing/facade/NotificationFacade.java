package com.example.instaKing.facade;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.NotificationDTO;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.Notification;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class NotificationFacade {

    @Value("${app.base-url}")
    private String baseUrl;

    public NotificationDTO toDTO(Notification notification) {
        NotificationDTO notificationDTO = new NotificationDTO();
        notificationDTO.setId(notification.getId());
        notificationDTO.setContent(notification.getContent());
        notificationDTO.setSenderId(notification.getSender().getId());
        notificationDTO.setRead(notification.isRead());
        notificationDTO.setCreatedAt(notification.getCreatedAt());
        notificationDTO.setType(notification.getType());
        notificationDTO.setSenderUsername(notification.getSender().getUsername());
        if (notification.getSender().getAvatarUrl() != null && !notification.getSender().getAvatarUrl().startsWith("http")) {
            notificationDTO.setSenderAvatarUrl(baseUrl + "/images/" + notification.getSender().getAvatarUrl());
        } else {
            notificationDTO.setSenderAvatarUrl(notification.getSender().getAvatarUrl());
        }
        return notificationDTO;
    }


}
