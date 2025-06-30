package com.example.instaKing.controllers;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.facade.PostFacade;
import com.example.instaKing.models.Post;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.services.PostService;
import com.example.instaKing.validators.ResponseErrorValidator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    public PostController( PostService postService, ResponseErrorValidator responseErrorValidator) {
        this.postService = postService;
        this.responseErrorValidator = responseErrorValidator;
    }

    @PostMapping("/create")
    public ResponseEntity<Object> createPost(@Valid @RequestBody PostDTO postDTO,
                                             BindingResult bindingResult,
                                             Principal principal) {
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse)) return errorResponse;

        Post post = postService.createPost(postDTO, principal);
        PostDTO createdPost = PostFacade.postToPostDTO(post);

        return new ResponseEntity<>(createdPost, HttpStatus.CREATED);
    }

    @GetMapping("/all")
    public ResponseEntity<List<PostDTO>> getAllPosts() {
        List<PostDTO> postsDTO = postService.getAllPosts()
                .stream()
                .map(PostFacade::postToPostDTO)
                .collect(Collectors.toList());

        return new ResponseEntity<>(postsDTO, HttpStatus.OK);
    }


    @GetMapping("/user/posts")
    public ResponseEntity<List<PostDTO>> getAllPostsForCurrentUser(Principal principal) {
        List<PostDTO> postsDTO = postService.getAllPostsForCurrentUser(principal)
                .stream()
                .map(PostFacade::postToPostDTO)
                .collect(Collectors.toList());
        return new ResponseEntity<>(postsDTO, HttpStatus.OK);
    }
    @GetMapping("/user/{username}")
    public ResponseEntity<List<PostDTO>> getAllPostsForUser(@PathVariable("username") String username) {
        List<PostDTO> postsDTO = postService.getAllPostsForUser(username)
                .stream()
                .map(PostFacade::postToPostDTO)
                .collect(Collectors.toList());
        return new ResponseEntity<>(postsDTO, HttpStatus.OK);
    }


    @PostMapping("/{postId}/{username}/like")
    public ResponseEntity<PostDTO> likePost(@PathVariable("postId") String postId,
                                            @PathVariable("username") String username) {
        Post post = postService.likePost(Long.parseLong(postId), username);
        PostDTO postDTO = PostFacade.postToPostDTO(post);

        return new ResponseEntity<>(postDTO, HttpStatus.OK);
    }


    @PostMapping("/{postId}/delete")
    public ResponseEntity<MessageResponse> deletePost(@PathVariable("postId") String postId, Principal principal) {
        postService.deletePost(Long.parseLong(postId), principal);
        return new ResponseEntity<>(new MessageResponse("PostService deleted successfully"), HttpStatus.OK);
    }
}
