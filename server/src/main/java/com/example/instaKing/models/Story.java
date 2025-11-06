package com.example.instaKing.models;

import com.example.instaKing.models.enums.StoryVisibility;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String mediaUrl;

    private int views;

    private String description;

    @Enumerated(EnumType.STRING)
    private StoryVisibility visibility = StoryVisibility.PUBLIC;


    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusHours(24);
    }

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
