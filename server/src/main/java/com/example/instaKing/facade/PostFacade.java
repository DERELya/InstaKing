package com.example.instaKing.facade;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.FavoriteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PostFacade {
    @Value("${app.base-url}")
    private String baseUrl;

    private final FavoriteRepository favoriteRepository;

    public PostFacade(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    public PostDTO postToPostDTO(Post post, User currentUser) {
        PostDTO postDTO = new PostDTO();
        postDTO.setId(post.getId());
        postDTO.setTitle(post.getTitle());
        postDTO.setLikes(post.getLikes());
        postDTO.setCaption(post.getCaption());
        postDTO.setUsername(post.getUser().getUsername());
        postDTO.setUsersLiked(post.getLikedUser());
        postDTO.setLocation(post.getLocation());

        Optional<Favorite> favoriteOpt = favoriteRepository.findByUserAndPost(currentUser, post);
        postDTO.setFavorited(favoriteOpt.isPresent());
        favoriteOpt.ifPresent(fav -> postDTO.setAddedAt(fav.getAddedAt()));

        boolean isFavorited = favoriteRepository.existsByUserAndPost(currentUser, post);
        postDTO.setFavorited(isFavorited);
        if (post.getUser().getAvatarUrl() != null && !post.getUser().getAvatarUrl().startsWith("http")) {
            postDTO.setAvatarUrl(baseUrl + "/images/" + post.getUser().getAvatarUrl());
        } else {
            postDTO.setAvatarUrl(post.getUser().getAvatarUrl());
        }
        return postDTO;
    }


}
