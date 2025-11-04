package com.example.instaKing.controllers;

import com.example.instaKing.dto.StoryDTO;
import com.example.instaKing.dto.StoryViewDTO;
import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.facade.Facade;
import com.example.instaKing.models.Story;
import com.example.instaKing.models.User;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.services.StoryService;
import com.example.instaKing.services.UserService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin
@RestController
@RequestMapping("api/story")
public class StoryController {
    private final StoryService storyService;
    private final UserService userService;
    private final Facade facade;

    public StoryController(StoryService storyService, UserService userService, Facade facade) {
        this.storyService = storyService;
        this.userService = userService;
        this.facade = facade;
    }

    @PostMapping("/create")
    public ResponseEntity<Object> createStory(@Valid @ModelAttribute StoryDTO storyDTO,
                                              @RequestParam("file") MultipartFile file,
                                              BindingResult bindingResult,
                                              Principal principal) throws IOException {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body("Validation error");
        }
        User user = userService.getCurrentUser(principal);
        Story story = storyService.createStory(storyDTO, principal, file);
        System.out.println(story.getUser().getUsername());
        StoryDTO returnStoryDTO = facade.storyToStoryDTO(story,user);
        return new ResponseEntity<>(returnStoryDTO, HttpStatus.CREATED);
    }

    @GetMapping("/getStoriesForUser/{username}")
    public ResponseEntity<List<StoryDTO>> getStoriesForUser(@PathVariable String username,Principal principal) {
        List<StoryDTO> storyDTOList = storyService.getStoriesForUser(username,principal);
        return new ResponseEntity<>(storyDTOList, HttpStatus.OK);
    }

    @GetMapping("/getActiveStoriesForUser/{username}")
    public ResponseEntity<List<StoryDTO>> getActiveStoriesForUser(@PathVariable String username,Principal principal) {
        List<StoryDTO> storyDTOList = storyService.getActiveStoriesForUser(username,principal);
        return new ResponseEntity<>(storyDTOList, HttpStatus.OK);
    }
    @GetMapping("/hasActiveStoriesForUser/{username}")
    public ResponseEntity<Boolean> hasActiveStoriesForUser(@PathVariable String username) {
        return new ResponseEntity<>(storyService.hasActiveStory(username), HttpStatus.OK);
    }
    @GetMapping("/getUsernameActiveStoriesForMe")
    public ResponseEntity<List<String>> getActiveUsernameStoriesForMe(Principal principal) {
        return new ResponseEntity<>(storyService.getUsersStories(principal), HttpStatus.OK);
    }


    @PostMapping("/{storyId}/view")
    public ResponseEntity<Object> addView(@PathVariable Long storyId, Principal principal) {
        storyService.addView(storyId, principal);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @GetMapping("/{storyId}/views")
    public ResponseEntity<List<StoryViewDTO>> getViews(@PathVariable Long storyId, Principal principal) {
        return new ResponseEntity<>(storyService.getViews(storyId, principal), HttpStatus.OK);
    }

    @PostMapping("/delete/{storyId}")
    public ResponseEntity<Object> deleteStory(@PathVariable Long storyId, Principal principal) throws IOException {
        storyService.deleteStory(storyId,principal);
        return new ResponseEntity<>(new MessageResponse("Story deleted successfully"), HttpStatus.OK);
    }

    @GetMapping("/storiesOfFollowing")
    public ResponseEntity<List<StoryDTO>> getStoriesOfFollowing(Principal principal) {
        return new ResponseEntity<>(storyService.getStoriesOfFollowing(principal), HttpStatus.OK);
    }

    @GetMapping("/content/{url}")
    public ResponseEntity<Resource> getImageForUser(@PathVariable String url) throws IOException {
        Resource content = storyService.getContent(url);

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG) // Или другой формат
                .body(content);
    }
}
