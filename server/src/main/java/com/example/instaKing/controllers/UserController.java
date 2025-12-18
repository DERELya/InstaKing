package com.example.instaKing.controllers;

import com.example.instaKing.dto.PostDTO;
import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.facade.UserFacade;
import com.example.instaKing.models.User;
import com.example.instaKing.services.UserService;
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
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("api/user")
@CrossOrigin
public class UserController {

    private final UserService userService;
    private final ResponseErrorValidator responseErrorValidator;
    private final UserFacade userFacade;
    @Autowired
    public UserController(UserService userService, ResponseErrorValidator responseErrorValidator, UserFacade userFacade) {
        this.userService = userService;
        this.responseErrorValidator = responseErrorValidator;
        this.userFacade = userFacade;
    }

    @GetMapping("/")
    public ResponseEntity<UserDTO> getCurrentUser(Principal principal) {
        User user = userService.getCurrentUser(principal);

        UserDTO userDTO = userFacade.userToUserDTO(user);
        return new ResponseEntity<>(userDTO, HttpStatus.OK);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getUserProfile(@PathVariable("userId") String userId) {
        User user = userService.getUserById(Long.parseLong(userId));
        UserDTO userDTO = userFacade.userToUserDTO(user);
        return new ResponseEntity<>(userDTO, HttpStatus.OK);
    }

    @PostMapping("/update")
    public ResponseEntity<Object> updateUser(@Valid @RequestBody UserDTO userDTO, BindingResult bindingResult, Principal principal) {
        ResponseEntity<Object> errorResponse = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errorResponse)) return errorResponse;

        User user = userService.updateUser(userDTO, principal);

        UserDTO userUpdated = userFacade.userToUserDTO(user);
        return new ResponseEntity<>(userUpdated, HttpStatus.OK);
    }

    @GetMapping("/getUser/{username}")
    public ResponseEntity<UserDTO> getUserProfileByUsername(@PathVariable("username") String username) {
        User user = userService.getUserByUsername(username);
        UserDTO userDTO = userFacade.userToUserDTO(user);
        return new ResponseEntity<>(userDTO, HttpStatus.OK);
    }

    @PostMapping("/follow/{followingUsername}")
    public ResponseEntity<?> follow(Principal principal, @PathVariable String followingUsername) {
        userService.followUser(principal, followingUsername);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unfollow/{unfollowingUsername}")
    public ResponseEntity<?> unfollow(Principal principal, @PathVariable String unfollowingUsername) {
        userService.unfollowUser(principal, unfollowingUsername);
        return ResponseEntity.ok().build();
    }

    @GetMapping("{username}/followers")
    public ResponseEntity<Object> followersUser(@PathVariable("username") String username) {
        return new ResponseEntity<>(userService.getFollowersUser(username), HttpStatus.OK);
    }

    @GetMapping("{username}/following")
    public ResponseEntity<Object> followingUser(@PathVariable("username") String username) {
        return new ResponseEntity<>(userService.getFollowingUsers(username), HttpStatus.OK);
    }
    @GetMapping("{username}/isFollow")
    public ResponseEntity<Boolean> foll(Principal principal, @PathVariable String username) {
        if(Objects.equals(principal.getName(), username)) return ResponseEntity.ok(false);
        boolean following=userService.isFollowing(principal.getName(), username);
        return ResponseEntity.ok(following);
    }

    @GetMapping("/search/{username}")
    public ResponseEntity<?> search(@PathVariable("username") String username) {
        List<UserDTO> followingsDTO = userService.search(username)
                .stream()
                .map(userFacade::userToUserDTO).collect(Collectors.toList());
        return new ResponseEntity<>(followingsDTO, HttpStatus.OK);
    }

    @PostMapping("/isFollowingBatch")
    public Map<String, Boolean> isFollowingBatch(
            Principal principal,
            @RequestBody List<String> usernames) {
        return userService.isFollowingBatch(principal.getName(), usernames);
    }

}
