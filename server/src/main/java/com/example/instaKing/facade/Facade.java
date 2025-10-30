package com.example.instaKing.facade;

import com.example.instaKing.dto.FavoriteDTO;
import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.dto.StoryDTO;
import com.example.instaKing.dto.StoryViewDTO;
import com.example.instaKing.models.*;
import com.example.instaKing.repositories.FavoriteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class Facade {

    private final FavoriteRepository favoriteRepository;

    @Autowired
    public Facade(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    public FavoriteDTO postToFavoriteDTO(Favorite favorite, User currentUser) {
        PostDTO postDTO = new PostDTO();
        postDTO.setId(favorite.getPost().getId());
        postDTO.setTitle(favorite.getPost().getTitle());
        postDTO.setLikes(favorite.getPost().getLikes());
        postDTO.setCaption(favorite.getPost().getCaption());
        postDTO.setUsername(favorite.getPost().getUser().getUsername());
        postDTO.setUsersLiked(favorite.getPost().getLikedUser());
        postDTO.setLocation(favorite.getPost().getLocation());
        boolean isFavorited = favoriteRepository.existsByUserAndPost(currentUser, favorite.getPost());
        postDTO.setFavorited(isFavorited);
        FavoriteDTO favoriteDTO = new FavoriteDTO();
        favoriteDTO.setPost(postDTO);
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

    public StoryDTO storyToStoryDTO(Story story, User currentUser) {
        StoryDTO storyDTO=new StoryDTO();
        storyDTO.setId(story.getId());
        storyDTO.setViews(story.getViews());
        storyDTO.setMediaUrl(story.getMediaUrl());
        storyDTO.setCreatedAt(story.getCreatedAt());
        storyDTO.setExpiresAt(story.getExpiresAt());
        storyDTO.setUsername(story.getUser().getUsername());
        Map<String, LocalDateTime> viewedMap = story.getViewsDetails()
                .stream()
                .collect(Collectors.toMap(
                        view -> view.getUser().getUsername(),
                        StoryView::getViewedAt
                ));
        storyDTO.setUsersViewed(viewedMap);

        boolean viewed = story.getViewsDetails().stream()
                .anyMatch(v -> v.getUser().getUsername().equals(currentUser.getUsername()));
        storyDTO.setViewed(viewed);
        return storyDTO;
    }

}