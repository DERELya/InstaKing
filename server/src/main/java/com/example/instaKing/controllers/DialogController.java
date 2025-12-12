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
import org.springframework.web.bind.annotation.*;

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
        return conversationMapper.toDto(conversation,userA);
    }



    @GetMapping("/{conversationId}/messages")
    public List<MessageDTO> getConversationHistory(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal) {

        // Тут можно добавить проверку, что текущий пользователь является участником диалога!

        List<Message> messages = chatService.getMessageHistory(conversationId, page, size);

        return messages.stream()
                .map(MessageMapper::toDTO)
                .collect(Collectors.toList());
    }


    @PostMapping("/{conversationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAsRead(@PathVariable Long conversationId, Principal principal) {
        User reader = userService.getUserByUsername(principal.getName());

        chatService.markConversationAsRead(conversationId, reader.getId());

        // Опционально: можно отправить по WebSocket уведомление другому участнику,
        // что все сообщения прочитаны (если нужно показывать статус "Прочитано" в реальном времени).
    }

}
