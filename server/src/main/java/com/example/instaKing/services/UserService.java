package com.example.instaKing.services;

import com.example.instaKing.exceptions.UserExistException;
import com.example.instaKing.models.User;
import com.example.instaKing.models.enums.ERole;
import com.example.instaKing.payload.request.SignUpRequest;
import com.example.instaKing.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
        user.setName(userIn.getName());
        user.setLastname(userIn.getLastname());
        user.setUsername(userIn.getUsername());
        user.setPassword(passwordEncoder.encode(userIn.getPassword()));
        user.getRoles().add(ERole.ROLE_USER);

        try{
            log.info("User created", user.getUsername());
            return userRepository.save(user);
        }catch (Exception e){
            log.error("error during registration" + e.getMessage());
            throw new UserExistException("the user "+user.getUsername()+" already exist");
        }
    }
}
