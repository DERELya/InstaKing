package com.example.instaKing.facade;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.FavoriteRepository;
import com.example.instaKing.services.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class PostFacade {

    @Value("${app.base-url}")
    private String baseUrl;

    private final FavoriteRepository favoriteRepository;
    private final UserService userService;
    public PostFacade(FavoriteRepository favoriteRepository, UserService userService, UserService userService1) {
        this.favoriteRepository = favoriteRepository;
        this.userService = userService1;
    }

    public PostDTO postToPostDTO(Post post, User currentUser) {
        PostDTO postDTO = new PostDTO();
        postDTO.setId(post.getId());
        postDTO.setTitle(post.getTitle());
        postDTO.setLikes(post.getLikes());
        postDTO.setCaption(post.getCaption());
        postDTO.setUsername(post.getUser().getUsername());
        HashMap<String,String> usersLiked = new HashMap<>();
        for (String s:post.getLikedUser()){
            usersLiked.put(s,userService.getAvatarUrl(s));
        }
        postDTO.setUsersLiked(usersLiked);
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
