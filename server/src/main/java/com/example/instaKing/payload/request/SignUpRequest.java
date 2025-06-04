package com.example.instaKing.payload.request;

import com.example.instaKing.annotations.ValidEmail;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignUpRequest {
    @Email(message = "It should have format email")
    @NotBlank(message = "User email is required")
    @ValidEmail
    private String email;

    @NotEmpty(message = "Please enter your name")
    private String name;

    @NotEmpty(message = "Please enter your lastname")
    private String lastname;

    @NotEmpty(message = "Please enter your username")
    private String username;

    @NotEmpty(message = "Password is required")
    @Size(min = 8)
    private String password;

    private String confirmPassword;
}
