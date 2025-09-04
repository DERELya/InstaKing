package com.example.instaKing.controllers;

import com.example.instaKing.dto.FavoriteDTO;
import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.facade.Facade;
import com.example.instaKing.models.Favorite;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.FavoriteRepository;
import com.example.instaKing.repositories.PostRepository;
import com.example.instaKing.services.FavoriteService;
import com.example.instaKing.services.PostService;
import com.example.instaKing.services.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/api/favorite")
@CrossOrigin
public class FavoriteControllers {
    private final UserService userService;
    private final FavoriteService favoriteService;
    private final FavoriteRepository favoriteRepository;
    private final PostService postService;
    private final PostRepository postRepository;

    public FavoriteControllers(UserService userService, FavoriteService favoriteService, FavoriteRepository favoriteRepository, PostService postService, PostRepository postRepository) {
        this.userService = userService;
        this.favoriteService = favoriteService;
        this.favoriteRepository = favoriteRepository;
        this.postService = postService;
        this.postRepository = postRepository;
    }

    @GetMapping()
    public ResponseEntity<List<PostDTO>> getFavorites(Principal principal) {
        User user = userService.getCurrentUser(principal);
        List<PostDTO> postDTO=favoriteService.getFavorites(user.getId())
                .stream()
                .map(Facade::postToPostDTO)
                .toList();
         return ResponseEntity.ok(postDTO);
    }

    @PostMapping("/{postId}")
    public ResponseEntity<String> toggleFavorite(Principal principal, @PathVariable Long postId) {
        User user = userService.getCurrentUser(principal);
        boolean added = favoriteService.toggleFavorite(user.getId(), postId);
        return ResponseEntity.ok(added ? "added" : "removed");
    }

}
