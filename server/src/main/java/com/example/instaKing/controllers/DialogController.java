package com.example.instaKing.controllers;

import com.example.instaKing.dto.ConversationDTO;
import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.StartChatDTO;
import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.facade.ConversationMapper;
import com.example.instaKing.facade.MessageMapper;
import com.example.instaKing.facade.UserFacade;
import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.User;
import com.example.instaKing.services.ChatService;
import com.example.instaKing.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class DialogController {
    private final ChatService chatService;
    private final UserService userService;
    private final ConversationMapper conversationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public List<ConversationDTO> getUserConversation(Principal principal) {
        User currentUser = userService.getUserByUsername(principal.getName());
        List<Conversation> conversations=chatService.getConversationByUser(currentUser.getId());
        return conversations.stream()
                .map(c->conversationMapper.toDto(c,currentUser))
                .collect(Collectors.toList());
    }

    @PostMapping("/start")
    public ConversationDTO startNewConversation(@RequestBody StartChatDTO startChatDto, Principal principal) {
        User userA = userService.getUserByUsername(principal.getName());
        User userB = userService.getUserById(startChatDto.getRecipientId());
        Conversation conversation = chatService.getOrCreatePrivateConversation(
                userA.getId(),
                userB.getId()
        );
        ConversationDTO dto = conversationMapper.toDto(conversation, userA);
        messagingTemplate.convertAndSendToUser(
                userB.getUsername().toString(),
                "/queue/new-chats",
                dto
        );
        return dto;
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id, Principal principal) {
        User user = userService.getUserByUsername(principal.getName());
        chatService.deleteMessage(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{conversationId}/read")
    public void markAsRead(@PathVariable Long conversationId, Principal principal) {

        boolean isParticipant = chatService.isUserParticipant(conversationId, principal.getName());
        if (!isParticipant) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Вы не участник этого чата");
        }
        User user = userService.getUserByUsername(principal.getName());
        chatService.markConversationAsRead(conversationId, user.getId());
    }



    @GetMapping("/{conversationId}/messages")
    public List<MessageDTO> getConversationHistory(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal) {

        boolean isParticipant = chatService.isUserParticipant(conversationId, principal.getName());
        if (!isParticipant) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Вы не участник этого чата");
        }

        List<Message> messages = chatService.getMessageHistory(conversationId, page, size);
        return messages.stream()
                .map(MessageMapper::toDTO)
                .collect(Collectors.toList());
    }

}
