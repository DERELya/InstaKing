package com.example.instaKing.services;

import com.example.instaKing.dto.StoryDTO;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.Story;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.StoryRepository;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;

@Service
public class StoryService {
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;

    public StoryService(StoryRepository storyRepository, UserRepository userRepository) {
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
    }

    public Story createStory(StoryDTO storyDTO, Principal principal){
        User user = getUserByPrincipal(principal);
        Story story = new Story();
        story.setUser(user);
        story.setViews(0);
        story.setMediaUrl(storyDTO.getMediaUrl());
        return storyRepository.save(story);
    }

    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }
}

