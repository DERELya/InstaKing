package com.example.instaKing.facade;

import com.example.instaKing.dto.*;
import com.example.instaKing.payload.response.ResponseForStoryMain;
import com.example.instaKing.models.*;
import com.example.instaKing.repositories.FavoriteRepository;
import com.example.instaKing.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class Facade {
    @Value("${app.base-url}")
    private String baseUrl;

    private final FavoriteRepository favoriteRepository;
    private final UserService userService;
    @Autowired
    public Facade(FavoriteRepository favoriteRepository, UserService userService) {
        this.favoriteRepository = favoriteRepository;
        this.userService = userService;
    }

    public FavoriteDTO postToFavoriteDTO(Favorite favorite, User currentUser) {
        PostDTO postDTO = new PostDTO();
        postDTO.setId(favorite.getPost().getId());
        postDTO.setTitle(favorite.getPost().getTitle());
        postDTO.setLikes(favorite.getPost().getLikes());
        postDTO.setCaption(favorite.getPost().getCaption());
        postDTO.setUsername(favorite.getPost().getUser().getUsername());
        HashMap<String,String> usersLiked = new HashMap<>();
        for (String s:favorite.getPost().getLikedUser()){
            usersLiked.put(s,userService.getAvatarUrl(s));
        }
        postDTO.setUsersLiked(usersLiked);
        postDTO.setLocation(favorite.getPost().getLocation());
        boolean isFavorited = favoriteRepository.existsByUserAndPost(currentUser, favorite.getPost());
        postDTO.setFavorited(isFavorited);
        FavoriteDTO favoriteDTO = new FavoriteDTO();
        favoriteDTO.setPost(postDTO);
        favoriteDTO.setAddedAt(favorite.getAddedAt());
        return favoriteDTO;
    }


    public StoryDTO storyToStoryDTO(Story story, User currentUser) {
        StoryDTO storyDTO=new StoryDTO();
        storyDTO.setId(story.getId());
        storyDTO.setViews(story.getViews());
        storyDTO.setMediaUrl(story.getMediaUrl());
        storyDTO.setCreatedAt(story.getCreatedAt());
        storyDTO.setExpiresAt(story.getExpiresAt());
        storyDTO.setUsername(story.getUser().getUsername());
        storyDTO.setVisibility(story.getVisibility());
        storyDTO.setDescription(story.getDescription());
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

        if (story.getUser().getAvatarUrl() != null && !story.getUser().getAvatarUrl().startsWith("http")) {
            storyDTO.setUserAvatarUrl(baseUrl + "/images/" + story.getUser().getAvatarUrl());
        } else {
            storyDTO.setUserAvatarUrl(story.getUser().getAvatarUrl());
        }
        return storyDTO;
    }


}