package com.example.instaKing.payload.request;

import com.example.instaKing.annotations.PasswordMatches;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@PasswordMatches
public class SignUpRequest {
    @Email(message = "It should have format email")
    @NotBlank(message = "UserService email is required")
    private String email;

    @NotEmpty(message = "Please enter your name")
    private String firstname;

    @NotEmpty(message = "Please enter your lastname")
    private String lastname;

    @NotEmpty(message = "Please enter your username")
    private String username;

    @NotEmpty(message = "Password is required")
    @Size(min = 8,max = 3000,message = "Password must be greater than 8 and less than 3000 ")
    private String password;

    private String confirmPassword;
}
