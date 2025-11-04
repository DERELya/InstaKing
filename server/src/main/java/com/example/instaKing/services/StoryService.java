package com.example.instaKing.services;

import com.example.instaKing.dto.StoryDTO;
import com.example.instaKing.dto.StoryViewDTO;
import com.example.instaKing.facade.Facade;
import com.example.instaKing.models.Story;
import com.example.instaKing.models.StoryView;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.StoryRepository;
import com.example.instaKing.repositories.StoryViewRepository;
import com.example.instaKing.repositories.UserRepository;
import com.example.instaKing.security.SecurityConstants;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.example.instaKing.security.SecurityConstants.UPLOAD_DIR_FOR_POSTS;
import static com.example.instaKing.security.SecurityConstants.UPLOAD_DIR_FOR_STORIES;

@Slf4j
@Service
public class StoryService {
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;
    private final StoryViewRepository storyViewRepository;
    private final Facade facade;

    public StoryService(StoryRepository storyRepository, UserRepository userRepository, StoryViewRepository storyViewRepository, Facade facade) {
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
        this.storyViewRepository = storyViewRepository;
        this.facade = facade;
    }

    public Story createStory(StoryDTO storyDTO, Principal principal, MultipartFile file) throws IOException {
        String mediaUrl = uploadContent(file);
        User user = getUserByPrincipal(principal);
        System.out.println("service"+user.getUsername());
        Story story = new Story();
        story.setUser(user);
        story.setViews(0);
        story.setMediaUrl(mediaUrl);

        return storyRepository.save(story);
    }

    private String uploadContent(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null ||
                !(contentType.startsWith("image/") || contentType.startsWith("video/"))) {
            throw new IllegalArgumentException("Недопустимый тип файла. Разрешены только изображения и видео.");
        }
        if (file.getSize() > 500 * 1024 * 1024) {
            throw new IllegalArgumentException("Файл слишком большой.");
        }


        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(SecurityConstants.UPLOAD_DIR_FOR_STORIES + fileName);

        Files.createDirectories(filePath.getParent());
        Files.write(filePath, file.getBytes());

        return fileName;
    }

    public List<StoryDTO> getStoriesForUser(String username,Principal principal) {
        User currnetUser = getUserByPrincipal(principal);
        User user=userRepository.findByUsername(username).orElse(null);
        List<StoryDTO> stories =storyRepository.getStoriesByUser(user)
                .stream()
                .map(story -> facade.storyToStoryDTO(story,currnetUser))
                .collect(Collectors.toList());
        return stories;
    }
    public List<StoryDTO> getActiveStoriesForUser(String username,Principal principal) {
        User currnetUser = getUserByPrincipal(principal);
        User user=userRepository.findByUsername(username).orElse(null);
        List<StoryDTO> stories =storyRepository.getActiveStoryByUser(user,LocalDateTime.now())
                .stream()
                .map(story -> facade.storyToStoryDTO(story,currnetUser))
                .collect(Collectors.toList());
        return stories;
    }
    public boolean hasActiveStory(String username) {
        User user=userRepository.findByUsername(username).orElse(null);
        List<Story> stories=storyRepository.getActiveStoryByUser(user,LocalDateTime.now());
        if(stories.size()>0){
            return true;
        }
        else {
            return false;
        }
    }

    public List<String> getUsersStories(Principal principal) {
        User user=getUserByPrincipal(principal);
        List<User> followings=List.copyOf(user.getFollowing());
        if (followings.isEmpty()) {
            return List.of();
        }
        List<StoryDTO> stories =storyRepository.getActiveStoriesByUsers(followings,LocalDateTime.now())
                .stream()
                .map(story -> facade.storyToStoryDTO(story, user))
                .collect(Collectors.toList());
        List<String> userStories = stories.stream()
                .map(s->s.getUsername())
                .collect(Collectors.toList());
        return userStories;
    }

    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }


    @Transactional
    public void addView(Long storyId, Principal principal) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new RuntimeException("Story not found"));
        User user = getUserByPrincipal(principal);
        boolean alreadyViewed = story.getViewsDetails().stream()
                .anyMatch(v -> v.getUser().getId().equals(user.getId()));

        if (!alreadyViewed) {
            StoryView view = new StoryView();
            view.setStory(story);
            view.setUser(user);
            story.getViewsDetails().add(view);
            story.setViews(story.getViewsDetails().size());
            storyRepository.save(story);
        }
    }

    public List<StoryViewDTO> getViews(Long storyId, Principal principal) {
        User user=getUserByPrincipal(principal);
        Story story=storyRepository.findById(storyId)
                .orElseThrow(() -> new RuntimeException("Story not found"));
        if (!story.getUser().getUsername().equals(user.getUsername())) {
            throw new UsernameNotFoundException("story closed for you username");
        }
        else {
            return story.getViewsDetails()
                    .stream()
                    .map(view -> new StoryViewDTO(
                            view.getUser().getUsername(),
                            view.getViewedAt()
                    ))
                    .toList();
        }
    }

    public void deleteStory(Long storyId, Principal principal) throws IOException {
        User user=getUserByPrincipal(principal);
        Story story=storyRepository.findById(storyId)
                .orElseThrow(() -> new RuntimeException("Story not found"));
        if (!story.getUser().getUsername().equals(user.getUsername())) {
            throw new UsernameNotFoundException("story closed for you username");
        }
        Files.deleteIfExists(Paths.get(UPLOAD_DIR_FOR_STORIES + story.getMediaUrl()));
        storyRepository.delete(story);
    }

    public List<StoryDTO> getStoriesOfFollowing(Principal principal) {
        User user=getUserByPrincipal(principal);
        List<User> followings=List.copyOf(user.getFollowing());
        if (followings.isEmpty()) {
            return List.of();
        }
        return storyRepository.getActiveStoriesByUsers(followings,LocalDateTime.now())
                .stream()
                .map(story -> facade.storyToStoryDTO(story, user))
                .collect(Collectors.toList());
    }

    public Resource getContent(String url) throws IOException {
        Path filePath = Paths.get(UPLOAD_DIR_FOR_STORIES + url);
        Resource resource = new UrlResource(filePath.toUri());
        System.out.println(resource);
        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException("Image file not found: " + url);
        }
        return resource;
    }
}

