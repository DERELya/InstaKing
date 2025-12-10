package com.example.instaKing.services;

import com.example.instaKing.dto.MessageDTO;
import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.models.Message;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.MessageStatus;
import com.example.instaKing.repositories.MessageRepository;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;

@Service
public class MessageService {
    private MessageRepository messageRepository;
    private UserService userService;
    private UserRepository userRepository;

    @Autowired
    public void setMessageRepository(MessageRepository messageRepository, UserService userService,UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userService=userService;
        this.userRepository=userRepository;
    }

    public Message createMessage(MessageDTO messageDTO, Principal principal) {
        User user = getUserByPrincipal(principal);
        Message message = new Message();
        message.setSender(user.getUsername());
        message.setStatus(MessageStatus.SENT);
        message.setMessage(messageDTO.getMessage());
        User userid = userService.getUserByUsername(messageDTO.getUsername());
        message.setReceiver(userid.getUsername());
        return messageRepository.save(message);
    }



    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }

}
