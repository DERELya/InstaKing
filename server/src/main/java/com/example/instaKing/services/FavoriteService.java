package com.example.instaKing.services;

import com.example.instaKing.exceptions.PostNotFoundException;
import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.FavoriteRepository;
import com.example.instaKing.repositories.PostRepository;
import com.example.instaKing.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;

    public boolean toggleFavorite(Long userId, Long postId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        return favoriteRepository.findByUserAndPost(user, post)
                .map(fav -> {
                    favoriteRepository.delete(fav);
                    return false; // удалено
                })
                .orElseGet(() -> {
                    Favorite favorite = new Favorite();
                    favorite.setUser(user);
                    favorite.setPost(post);
                    favorite.setAddedAt(LocalDateTime.now());
                    favoriteRepository.save(favorite);
                    return true; // добавлено
                });
    }


    public void removeFromFavorites(Long userId,Long postId) {
        User user=userRepository.findById(userId).orElseThrow();
        Post post=postRepository.findById(postId).orElseThrow();
        favoriteRepository.deleteByUserAndPost(user,post);
    }

    public List<Post> getFavorites(Long userId) {
        User user=userRepository.findById(userId).orElseThrow();
        return favoriteRepository.findByUser(user).stream()
                .map(Favorite::getPost)
                .collect(Collectors.toList());
    }
}
