package com.example.instaKing.services;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.exceptions.PostNotFoundException;
import com.example.instaKing.models.ImageModel;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.ImageRepository;
import com.example.instaKing.repositories.PostRepository;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class PostService {
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ImageRepository imageRepository;

    @Autowired
    public PostService(PostRepository postRepository, UserRepository userRepository, ImageRepository imageRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.imageRepository = imageRepository;
    }

    public Post createPost(PostDTO postDTO, Principal principal) {
        User user = getUserByPrincipal(principal);
        Post post = new Post();
        post.setUser(user);
        post.setCaption(postDTO.getCaption());
        post.setLocation(postDTO.getLocation());
        post.setTitle(postDTO.getTitle());
        post.setLikes(0);
        return postRepository.save(post);
    }

    public List<Post> getPosts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return postRepository.findAll(pageable).getContent();
    }

    public List<Post> getAllPosts() {
        return postRepository.findByOrderByCreatedAtDesc();
    }

    public Post getPostById(Long postId, Principal principal) {
        User user = getUserByPrincipal(principal);

        return postRepository.findByIdAndUser(postId, user)
                .orElseThrow(() -> new PostNotFoundException("PostService not found for username" + user.getUsername()));
    }

    public List<Post> getAllPostsForCurrentUser(Principal principal) {
        User user = getUserByPrincipal(principal);
        return postRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Post likePost(Long postId, String username) {
        Post post = postRepository.findById(postId).
                orElseThrow(() -> new PostNotFoundException("PostService cannot be found"));
        Optional<String> userLiked = post.getLikedUser()
                .stream()
                .filter(u -> u.equals(username)).findAny();
        if (userLiked.isPresent()) {
            post.setLikes(post.getLikes() - 1);
            post.getLikedUser().remove(username);
        } else {
            post.setLikes(post.getLikes() + 1);
            post.getLikedUser().add(username);
        }
        return postRepository.save(post);


    }

    public void deletePost(Long postId, Principal principal) {
        Post post = getPostById(postId, principal);
        Optional<ImageModel> imageModel = imageRepository.findByPostId(post.getId());
        postRepository.delete(post);
        imageModel.ifPresent(imageRepository::delete);
    }

    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }

    public List<Post> getAllPostsForUser(String username) {
        User user=userRepository.findByUsername(username).orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
        return postRepository.findByUserOrderByCreatedAtDesc(user);
    }
}
