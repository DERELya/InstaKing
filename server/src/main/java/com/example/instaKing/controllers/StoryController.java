package com.example.instaKing.controllers;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.dto.StoryDTO;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.Story;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.StoryRepository;
import com.example.instaKing.services.StoryService;
import com.example.instaKing.services.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.ObjectUtils;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@CrossOrigin
@RestController
@RequestMapping("api/story")
public class StoryController {
    private final StoryService storyService;
    private final UserService userService;

    public StoryController(StoryService storyService) {
        this.storyService = storyService;
    }

    @PostMapping("/create")
    public ResponseEntity<Object> createStory(@Valid @RequestBody StoryDTO storyDTO,
                                             BindingResult bindingResult,
                                             Principal principal) {
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse)) return errorResponse;
        User user = userService.getCurrentUser(principal);
        Story story = storyService.createStory(storyDTO,principal);
        Post post = postService.createPost(postDTO, principal);
        PostDTO createdPost = postFacade.postToPostDTO(post,user);

        return new ResponseEntity<>(createdPost, HttpStatus.CREATED);
    }
}
