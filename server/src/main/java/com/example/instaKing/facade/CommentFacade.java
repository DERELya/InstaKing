package com.example.instaKing.facade;

import com.example.instaKing.dto.CommentDTO;
import com.example.instaKing.models.Comment;
import com.example.instaKing.models.User;
import com.example.instaKing.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CommentFacade {
    @Value("${app.base-url}")
    private String baseUrl;

    private UserService userService;

    @Autowired
    public CommentFacade(UserService userService) {
        this.userService = userService;
    }


    public  CommentDTO CommentToCommentDTO(Comment comment) {
        CommentDTO commentDTO = new CommentDTO();
        User user = userService.getUserById(comment.getUserId());
        commentDTO.setId(comment.getId());
        commentDTO.setUsername(comment.getUsername());
        commentDTO.setMessage(comment.getMessage());
        commentDTO.setCreatedDate(comment.getCreatedDate());
        if (user.getAvatarUrl() != null && !user.getAvatarUrl().startsWith("http")) {
            commentDTO.setAvatarUrl(baseUrl + "/images/" + user.getAvatarUrl());
        } else {
            commentDTO.setAvatarUrl(user.getAvatarUrl());
        }
        return commentDTO;
    }
}
