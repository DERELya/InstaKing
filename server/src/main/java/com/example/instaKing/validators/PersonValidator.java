package com.example.instaKing.validators;

import com.example.instaKing.models.User;
import com.example.instaKing.payload.request.SignUpRequest;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PersonValidator {
    @Autowired
    private final UserRepository userRepository;

    public PersonValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void validate(SignUpRequest user){

        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            throw new DataIntegrityViolationException("Email уже зарегистрирован!");
        }

        existingUser = userRepository.findByUsername(user.getUsername());
        if (existingUser.isPresent()) {
            throw new DataIntegrityViolationException("Username уже есть!");
        }
    }
}
