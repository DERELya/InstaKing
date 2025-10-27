package com.example.instaKing.repositories;

import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Integer> {

    List<Favorite> findByUser(User user);
    List<Favorite> findByUserOrderByAddedAtDesc(User user);
    boolean existsByUserAndPost(User user,Post post);
    void  deleteByUserAndPost(User user, Post post);
    Optional<Favorite> findByUserAndPost(User user, Post post);
}
