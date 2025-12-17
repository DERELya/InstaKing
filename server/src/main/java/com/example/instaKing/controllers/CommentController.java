package com.example.instaKing.controllers;

import com.example.instaKing.dto.CommentDTO;
import com.example.instaKing.payload.response.CommentPageResponse;
import com.example.instaKing.facade.CommentFacade;
import com.example.instaKing.models.Comment;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.services.CommentService;
import com.example.instaKing.services.NotificationService;
import com.example.instaKing.validators.ResponseErrorValidator;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
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
    private ResponseErrorValidator responseErrorValidator;
    private NotificationService notificationService;
    private CommentFacade commentFacade;
    @Autowired
    public CommentController(CommentService commentService, ResponseErrorValidator responseErrorValidator, NotificationService notificationService, CommentFacade commentFacade) {
        this.commentService = commentService;
        this.responseErrorValidator = responseErrorValidator;
        this.notificationService = notificationService;
        this.commentFacade = commentFacade;
    }

    @PostMapping("/{postId}/create")
    public ResponseEntity<Object> createComment(@Valid @RequestBody CommentDTO commentDTO,
                                                @PathVariable("postId") String postId,
                                                BindingResult bindingResult,
                                                Principal principal) {
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse)) return errorResponse;

        Comment comment = commentService.saveComment(Long.parseLong(postId), commentDTO, principal);
        CommentDTO createdComment = commentFacade.CommentToCommentDTO(comment);
        return new ResponseEntity<>(createdComment, HttpStatus.CREATED);
    }



    @GetMapping("/{postId}/all")
    public ResponseEntity<List<CommentDTO>> getAllComments(@PathVariable("postId") String postId) {
        List<CommentDTO> commentsDTOList = commentService.getAllCommentForPost(Long.parseLong(postId))
                .stream()
                .map(commentFacade::CommentToCommentDTO)
                .collect(Collectors.toList());

        return new ResponseEntity<>(commentsDTOList, HttpStatus.OK);
    }

    @GetMapping("/{postId}/countComment")
    public ResponseEntity<Object> getCommentCount(@PathVariable("postId") String postId) {
        long count = commentService.getCountCommentForPost(Long.parseLong(postId));
        return ResponseEntity.ok(count);
    }

    @PostMapping("/{commentId}/delete")
    public ResponseEntity<MessageResponse> deleteComment(@PathVariable("commentId") String commentId) {
        commentService.deleteComment(Long.parseLong(commentId));
        return new ResponseEntity<>(new MessageResponse("PostService was deleted"), HttpStatus.OK);
    }

    @GetMapping("{postId}/comments")
    public ResponseEntity<CommentPageResponse> getPosts(@RequestParam int page, @RequestParam int size,
                                                     @PathVariable("postId") String postId) {
        Page<Comment> commentPage = (Page<Comment>) commentService.getComments(Long.parseLong(postId), page, size);
        List<CommentDTO> commentsDTO = commentPage.getContent()
                .stream()
                .map(commentFacade::CommentToCommentDTO)
                .collect(Collectors.toList());

        CommentPageResponse response = new CommentPageResponse(
                commentsDTO,
                commentPage.getTotalElements(),
                commentPage.getTotalPages(),
                commentPage.getNumber(),
                commentPage.getSize()
        );

        return ResponseEntity.ok(response);
    }
}
