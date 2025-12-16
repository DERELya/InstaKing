package com.example.instaKing.controllers;

import com.example.instaKing.dto.NotificationDTO;
import com.example.instaKing.models.User;
import com.example.instaKing.services.NotificationService;
import com.example.instaKing.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserService userService;

    @GetMapping
    public List<NotificationDTO> getMyNotifications(Principal principal) {
        User user = userService.getUserByUsername(principal.getName());
        return notificationService.getUserNotifications(user);
    }

    @PostMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }

    @PostMapping("/read-all")
    public void markAllAsRead(Principal principal) {
        User user = userService.getUserByUsername(principal.getName());
        notificationService.markAllAsReadForUser(user);
    }

}
