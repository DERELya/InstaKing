package com.example.instaKing.facade;

import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.models.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class UserFacade {

    @Value("${app.base-url}")
    private String baseUrl;


    public UserDTO userToUserDTO(User user) {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(user.getId());
        userDTO.setUsername(user.getUsername());
        userDTO.setFirstname(user.getFirstname());
        userDTO.setLastname(user.getLastname());
        userDTO.setBio(user.getBio());
        if (user.getAvatarUrl() != null && !user.getAvatarUrl().startsWith("http")) {
            userDTO.setAvatarUrl(baseUrl + "/images/" + user.getAvatarUrl());
        } else {
            userDTO.setAvatarUrl(user.getAvatarUrl());
        }
        return userDTO;
    }

}
