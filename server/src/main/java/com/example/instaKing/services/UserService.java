package com.example.instaKing.services;

import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.exceptions.UserExistException;
import com.example.instaKing.exceptions.UserNotFoundException;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.ERole;
import com.example.instaKing.payload.request.SignUpRequest;
import com.example.instaKing.repositories.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.beans.Transient;
import java.security.Principal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    public static final Logger log = LoggerFactory.getLogger(UserService.class.getName());

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User createUser(SignUpRequest userIn) {
        User user = new User();
        user.setEmail(userIn.getEmail());
        user.setFirstname(userIn.getFirstname());
        user.setLastname(userIn.getLastname());
        user.setUsername(userIn.getUsername());
        user.setPassword(passwordEncoder.encode(userIn.getPassword()));
        user.getRoles().add(ERole.ROLE_USER);

        try {
            log.info("UserService created", user.getUsername());
            return userRepository.save(user);
        } catch (Exception e) {
            log.error("error during registration" + e.getMessage());
            throw new UserExistException("the user " + user.getUsername() + " already exist");
        }
    }

    public User updateUser(UserDTO userDTO, Principal principal) {

        User user = getUserByPrincipal(principal);
        user.setFirstname(userDTO.getFirstname());
        user.setLastname(userDTO.getLastname());
        user.setBio(userDTO.getBio());

        return userRepository.save(user);
    }

    public User getCurrentUser(Principal principal) {
        return getUserByPrincipal(principal);
    }

    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with userid" + userId));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with userid" + username));
    }

    public List<User> getFollowersUser(String username) {
        return userRepository.findAllByFollowers_Username(username);
    }

    public List<User> getFollowingUsers(String username) {
        return userRepository.findAllByFollowing_Username(username);
    }

    @Transactional
    public void followUser(Principal principal, String followingUsername) {
        if (principal.getName().equals(followingUsername)) {
            return;
        }
        User follower = getUserByPrincipal(principal);
        User following = userRepository.findByUsername(followingUsername).orElseThrow();
        following.getFollowing().add(follower);
        userRepository.save(following);
    }

    @Transactional
    public void unfollowUser(Principal principal, String followingUsername) {
        User follower = getUserByPrincipal(principal);
        User following = userRepository.findByUsername(followingUsername).orElseThrow();
        following.getFollowing().remove(follower);
        userRepository.save(following);
    }

    public boolean isFollowing(String currentUsername, String targetUsername) {

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UsernameNotFoundException(currentUsername));
        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new UsernameNotFoundException(targetUsername));
        Set<User> followers = new HashSet<>(currentUser.getFollowers());
        return followers.contains(targetUser);
    }

    public List<User> search(String query) {
        return userRepository.findAllByUsernameContaining(query);
    }

    public Map<String, Boolean> isFollowingBatch(String currentUsername, List<String> usernames) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UserNotFoundException(currentUsername));
        Set<User> following = currentUser.getFollowers();
        return usernames.stream()
                .collect(Collectors.toMap(
                        username -> username,
                        username -> following.stream()
                                .anyMatch(u -> u.getUsername().equals(username))
                ));
    }

    public void addCloseFriend(String username, String friendUsername) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        User friend = userRepository.findByUsername(friendUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Friend not found"));

        user.getCloseFriends().add(friend);
        userRepository.save(user);
    }

    public void removeCloseFriend(String username, String friendUsername) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        User friend = userRepository.findByUsername(friendUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Friend not found"));

        user.getCloseFriends().remove(friend);
        userRepository.save(user);
    }

    public Set<User> getCloseFriends(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return user.getCloseFriends();
    }

}
