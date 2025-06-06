package com.example.instaKing.repositories;

import com.example.instaKing.models.Comment;
import com.example.instaKing.models.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    Comment findByIdAndUserId(Long id, Long userId);

    List<Comment> findAllByPost(Post post);
}
