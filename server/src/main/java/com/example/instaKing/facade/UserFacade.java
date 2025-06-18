package com.example.instaKing.facade;

import com.example.instaKing.dto.UserDTO;
import com.example.instaKing.models.User;
import org.springframework.stereotype.Component;

@Component
public class UserFacade {
    public UserDTO userToUserDTO(User user) {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(user.getId());
        userDTO.setUsername(user.getUsername());
        userDTO.setFirstName(user.getFirstname());
        userDTO.setLastName(user.getLastname());
        userDTO.setBio(user.getBio());

        return userDTO;
    }


}
