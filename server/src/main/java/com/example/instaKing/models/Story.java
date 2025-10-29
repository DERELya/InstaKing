package com.example.instaKing.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Автор сторис
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Ссылка на изображение или видео
    private String mediaUrl;

    // Количество просмотров
    private int views;

    // Когда создана сторис
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // Когда истечёт срок действия сторис
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusHours(24);
    }

    // Удобный метод для проверки
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<StoryView> viewsDetails = new HashSet<>();

    public void addView(User user) {
        boolean alreadyViewed = viewsDetails.stream()
                .anyMatch(v -> v.getUser().equals(user));
        if (!alreadyViewed) {
            StoryView view = new StoryView();
            view.setStory(this);
            view.setUser(user);
            viewsDetails.add(view);
            this.views = viewsDetails.size();
        }
    }
}
