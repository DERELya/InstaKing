package com.example.instaKing.repositories;

import com.example.instaKing.models.Story;
import com.example.instaKing.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    List<Story> getStoriesByUser(User user);

    Story getStoriesByIdIs(Long id);

    @Query("SELECT s FROM Story s WHERE s.user IN :users AND s.expiresAt > :now")
    List<Story> getActiveStoriesByUsers(List<User> users, LocalDateTime now);

    @Query("SELECT s FROM Story s WHERE s.user=:user AND s.expiresAt > :now")
    List<Story> getActiveStoryByUser(User user, LocalDateTime now);
}
