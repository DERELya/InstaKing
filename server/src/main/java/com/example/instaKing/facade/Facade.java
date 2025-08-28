package com.example.instaKing.facade;

import com.example.instaKing.dto.FavoriteDTO;
import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;

public class Facade {
    public static FavoriteDTO FavoriteToFavoriteDTO(Favorite favorite){
        FavoriteDTO favoriteDTO = new FavoriteDTO();

        favoriteDTO.setUser(favorite.getUser());
        favoriteDTO.setPost(favorite.getPost());
        favoriteDTO.setAddedAt(favorite.getAddedAt());
        return favoriteDTO;
    }

    public static PostDTO postToPostDTO(Post post) {
        PostDTO postDTO = new PostDTO();
        postDTO.setId(post.getId());
        postDTO.setTitle(post.getTitle());
        postDTO.setLikes(post.getLikes());
        postDTO.setCaption(post.getCaption());
        postDTO.setUsername(post.getUser().getUsername());
        postDTO.setUsersLiked(post.getLikedUser());
        postDTO.setLocation(post.getLocation());
        return postDTO;
    }
}
