package com.example.instaKing.payload.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.Getter;

@Data
@Getter
public class LoginRequest {
    @NotEmpty(message = "Email cannot be empty")
    private String email;
    @NotEmpty(message = "Password cannot be empty")
    private String password;

}
