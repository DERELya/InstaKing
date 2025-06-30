package com.example.instaKing.facade;

import com.example.instaKing.dto.CommentDTO;
import com.example.instaKing.models.Comment;
import org.springframework.stereotype.Component;

public class CommentFacade {

    public static CommentDTO CommentToCommentDTO(Comment comment) {
        CommentDTO commentDTO = new CommentDTO();

        commentDTO.setId(comment.getId());
        commentDTO.setUsername(comment.getUsername());
        commentDTO.setMessage(comment.getMessage());

        return commentDTO;
    }
}
