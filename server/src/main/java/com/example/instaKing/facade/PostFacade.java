package com.example.instaKing.facade;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.models.Post;
import org.springframework.stereotype.Component;

@Component
public class PostFacade {
    public PostDTO postToPostDTO(Post post) {
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
}
