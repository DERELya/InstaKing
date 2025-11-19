package com.example.instaKing.controllers;

import com.example.instaKing.services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin
public class CloseFriendsController {
    private final UserService userService;
    
    public CloseFriendsController(UserService userService) {
        this.userService = userService;
    }
    @PostMapping("/add/{friendUsername}")
    public ResponseEntity<?> addCloseFriend(Principal principal, @PathVariable String friendUsername) {
        userService.addCloseFriend(principal.getName(), friendUsername);
        return ResponseEntity.ok("Пользователь добавлен в близкие друзья");
    }

    @PostMapping("/remove/{friendUsername}")
    public ResponseEntity<?> removeCloseFriend(Principal principal, @PathVariable String friendUsername) {
        userService.removeCloseFriend(principal.getName(), friendUsername);
        return ResponseEntity.ok("Пользователь удалён из близких друзей");
    }

    @GetMapping
    public ResponseEntity<?> getCloseFriends(Principal principal) {
        return ResponseEntity.ok(userService.getCloseFriends(principal.getName()));
    }

    @GetMapping("/userContain/{friendUsername}")
    public ResponseEntity<Boolean> getUserContainInFriends(Principal principal,@PathVariable String friendUsername) {
        return ResponseEntity.ok(userService.getUserContainInFriends(principal.getName(),friendUsername));
    }

}
