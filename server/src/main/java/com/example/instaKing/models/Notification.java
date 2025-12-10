package com.example.instaKing.models;

import com.example.instaKing.models.enums.NotificationType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    private User recipient;
    @ManyToOne
    private User sender;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private boolean isRead = false;

    private String content;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
