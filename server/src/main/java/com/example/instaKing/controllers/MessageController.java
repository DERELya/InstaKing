package com.example.instaKing.controllers;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.facade.MessageFacade;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.services.MessageService;
import com.example.instaKing.validators.ResponseErrorValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.ObjectUtils;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController()
@RequestMapping("/api/message")
@CrossOrigin
public class MessageController {
    private final MessageService messageService;
    private final ResponseErrorValidator responseErrorValidator;
    private final MessageFacade messageFacade;
    @Autowired
    public MessageController(MessageService messageService, ResponseErrorValidator responseErrorValidator, MessageFacade messageFacade) {
        this.messageService = messageService;
        this.messageFacade = messageFacade;
        this.responseErrorValidator = new ResponseErrorValidator();
    }

    @PostMapping("create")
    public ResponseEntity<Object> createMessage(@RequestBody MessageDTO messageDTO,
                                                Principal principal,
                                                BindingResult bindingResult) {
        messageService.createMessage(messageDTO, principal);
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse)) return errorResponse;
        Message message = messageService.createMessage(messageDTO, principal);
        MessageDTO createdMessage = messageFacade.messageToMessageDTO(message);

        return new ResponseEntity<>(createdMessage, HttpStatus.CREATED);
    }
}
