package com.example.instaKing.controllers;

import com.example.instaKing.dto.CommentDTO;
import com.example.instaKing.facade.CommentFacade;
import com.example.instaKing.models.Comment;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.services.CommentService;
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
@RequestMapping("/api/comment")
@CrossOrigin
public class CommentController {
    private CommentService commentService;
    private CommentFacade  commentFacade;
    private ResponseErrorValidator responseErrorValidator;

    @Autowired
    public CommentController(CommentService commentService, CommentFacade commentFacade, ResponseErrorValidator responseErrorValidator) {
        this.commentService = commentService;
        this.commentFacade = commentFacade;
        this.responseErrorValidator = responseErrorValidator;
    }

    @PostMapping("/{postId}/create")
    public ResponseEntity<Object> createComment(@Valid @RequestBody CommentDTO commentDTO,
                                                @PathVariable("postId") String postId,
                                                BindingResult bindingResult,
                                                Principal principal) {
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse))return errorResponse;

        Comment comment = commentService.saveComment(Long.parseLong(postId),commentDTO,principal);
        CommentDTO createdComment = commentFacade.CommentToCommentDTO(comment);

        return new ResponseEntity<>(createdComment, HttpStatus.CREATED);
    }


    @GetMapping("/{postId}/all")
    public ResponseEntity<List<CommentDTO>> getAllComments(@PathVariable("postId") String postId) {
        List<CommentDTO> commentsDTOList=commentService.getAllCommentForPost(Long.parseLong(postId))
                .stream()
                .map(commentFacade::CommentToCommentDTO)
                .collect(Collectors.toList());

        return new ResponseEntity<>(commentsDTOList, HttpStatus.OK);

    }

    @PostMapping("/{commentId}/delete")
    public ResponseEntity<MessageResponse> deleteComment(@PathVariable("commentId") String commentId) {
        commentService.deleteComment(Long.parseLong(commentId));
        return new ResponseEntity<>(new MessageResponse("PostService was deleted"), HttpStatus.OK);
    }
}
