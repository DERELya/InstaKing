package com.example.instaKing.repositories;

import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
     List<Post> findByUserOrderByCreatedAtDesc(User user);

     List<Post> findByOrderByCreatedAtDesc();

    Optional<Post> findByIdAndUser(Long id, User user);
}
