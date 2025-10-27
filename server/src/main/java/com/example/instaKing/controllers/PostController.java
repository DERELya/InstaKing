package com.example.instaKing.controllers;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.dto.PostPageResponse;
import com.example.instaKing.facade.Facade;
import com.example.instaKing.facade.PostFacade;
import com.example.instaKing.models.Comment;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.services.CommentService;
import com.example.instaKing.services.FavoriteService;
import com.example.instaKing.services.PostService;
import com.example.instaKing.services.UserService;
import com.example.instaKing.validators.ResponseErrorValidator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.ObjectUtils;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("api/post")
@CrossOrigin
public class PostController {

    private final ResponseErrorValidator responseErrorValidator;
    private final PostService postService;
    private final FavoriteService favoriteService;
    private final UserService userService;
    private final PostFacade postFacade;

    @Autowired
    public PostController(PostService postService, ResponseErrorValidator responseErrorValidator, FavoriteService favoriteService, UserService userService, PostFacade postFacade) {
        this.postService = postService;
        this.responseErrorValidator = responseErrorValidator;
        this.favoriteService = favoriteService;
        this.userService = userService;
        this.postFacade = postFacade;
    }

    @PostMapping("/create")
    public ResponseEntity<Object> createPost(@Valid @RequestBody PostDTO postDTO,
                                             BindingResult bindingResult,
                                             Principal principal) {
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse)) return errorResponse;
        User user = userService.getCurrentUser(principal);
        Post post = postService.createPost(postDTO, principal);
        PostDTO createdPost = postFacade.postToPostDTO(post,user);

        return new ResponseEntity<>(createdPost, HttpStatus.CREATED);
    }

    @GetMapping("/all")
    public ResponseEntity<List<PostDTO>> getAllPosts(Principal principal) {
        User currentUser=userService.getCurrentUser(principal);
        List<PostDTO> postsDTO = postService.getAllPosts()
                .stream()
                .map(post->postFacade.postToPostDTO(post,currentUser))
                .collect(Collectors.toList());

        return new ResponseEntity<>(postsDTO, HttpStatus.OK);
    }

    @GetMapping("/posts")
    public ResponseEntity<PostPageResponse> getPosts(@RequestParam int page,@RequestParam int size) {
        Page<Post> postPage = (Page<Post>) postService.getPosts( page, size);
        List<PostDTO> postsDTO=postPage.getContent().
                stream()
                .map(Facade::postToPostDTO)
                .collect(Collectors.toList());
        PostPageResponse response=new PostPageResponse(
                postsDTO,
                postPage.getTotalElements(),
                postPage.getTotalPages(),
                postPage.getNumber(),
                postPage.getSize()
        );

        return new ResponseEntity<>(response, HttpStatus.OK);
    }


    @GetMapping("/user/posts")
    public ResponseEntity<List<PostDTO>> getAllPostsForCurrentUser(Principal principal) {
        User currentUser = userService.getCurrentUser(principal);
        List<PostDTO> postsDTO = postService.getAllPostsForCurrentUser(principal)
                .stream()
                .map(post->postFacade.postToPostDTO(post,currentUser))
                .collect(Collectors.toList());
        return new ResponseEntity<>(postsDTO, HttpStatus.OK);
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<List<PostDTO>> getAllPostsForUser(@PathVariable("username") String username,
                                                            Principal principal) {
        User currentUser = userService.getCurrentUser(principal);

        List<PostDTO> postsDTO = postService.getAllPostsForUser(username)
                .stream()
                .map(post -> postFacade.postToPostDTO(post, currentUser))
                .collect(Collectors.toList());
        return new ResponseEntity<>(postsDTO, HttpStatus.OK);
    }


    @PostMapping("/{postId}/{username}/like")
    public ResponseEntity<PostDTO> likePost(@PathVariable("postId") String postId,
                                            @PathVariable("username") String username, Principal principal) {
        Post post = postService.likePost(Long.parseLong(postId), username);
        User currentUser=userService.getCurrentUser(principal);
        PostDTO postDTO = postFacade.postToPostDTO(post,currentUser);

        return new ResponseEntity<>(postDTO, HttpStatus.OK);
    }


    @PostMapping("/{postId}/delete")
    public ResponseEntity<MessageResponse> deletePost(@PathVariable("postId") String postId, Principal principal) {
        favoriteService.removeFromFavorites(principal,Long.parseLong(postId));
        postService.deletePost(Long.parseLong(postId), principal);
        return new ResponseEntity<>(new MessageResponse("PostService deleted successfully"), HttpStatus.OK);
    }
}
