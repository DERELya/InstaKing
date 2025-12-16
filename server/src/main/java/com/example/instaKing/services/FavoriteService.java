package com.example.instaKing.services;

import com.example.instaKing.dto.FavoriteDTO;
import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.exceptions.PostNotFoundException;
import com.example.instaKing.facade.Facade;
import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.NotificationType;
import com.example.instaKing.repositories.FavoriteRepository;
import com.example.instaKing.repositories.PostRepository;
import com.example.instaKing.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final Facade facade;
    private final NotificationService notificationService;


    public boolean toggleFavorite(Long userId, Long postId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        return favoriteRepository.findByUserAndPost(user, post)
                .map(fav -> {
                    favoriteRepository.delete(fav);
                    return false;
                })
                .orElseGet(() -> {
                    Favorite favorite = new Favorite();
                    favorite.setUser(user);
                    favorite.setPost(post);
                    favorite.setAddedAt(LocalDateTime.now());
                    favoriteRepository.save(favorite);
                    notificationService.createNotification(
                            post.getUser(),
                            user,
                            NotificationType.FAVORITE,
                            "Добавил в избранное ваш пост: "+ post.getTitle()
                    );
                    return true;
                });
    }

    @Transactional
    public void removeFromFavorites(Principal principal,Long postId) {
        User user=getUserByPrincipal(principal);
        Post post=postRepository.findById(postId).orElseThrow();
        favoriteRepository.deleteByUserAndPost(user,post);
    }


    public List<Post> getFavorites(Long userId) {
        User user=userRepository.findById(userId).orElseThrow();
        return favoriteRepository.findByUserOrderByAddedAtDesc(user).stream()
                .map(Favorite::getPost)
                .collect(Collectors.toList());
    }


    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }
}