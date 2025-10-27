package com.example.instaKing.facade;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.FavoriteRepository;
import org.springframework.stereotype.Component;

@Component
public class PostFacade {
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
        boolean isFavorited = favoriteRepository.existsByUserAndPost(currentUser, post);
        postDTO.setFavorited(isFavorited);
        return postDTO;
    }
}
