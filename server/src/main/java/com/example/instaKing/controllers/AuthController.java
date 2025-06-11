package com.example.instaKing.controllers;

import com.example.instaKing.payload.request.LoginRequest;
import com.example.instaKing.payload.request.SignUpRequest;
import com.example.instaKing.payload.response.JWTTokenSuccessResponse;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.security.JWTTokenProvider;
import com.example.instaKing.security.SecurityConstants;
import com.example.instaKing.services.UserService;
import com.example.instaKing.validators.PersonValidator;
import com.example.instaKing.validators.ResponseErrorValidator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.ObjectUtils;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping("/api/auth")
@PreAuthorize("permitAll()")
public class AuthController {

    private final ResponseErrorValidator responseErrorValidator;
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JWTTokenProvider jwtTokenProvider;
    private final PersonValidator  personValidator;

    @Autowired
    public AuthController(ResponseErrorValidator responseErrorValidator, UserService userService, AuthenticationManager authenticationManager, JWTTokenProvider jwtTokenProvider, PersonValidator personValidator) {
        this.responseErrorValidator = responseErrorValidator;
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.personValidator = personValidator;
    }

    @PostMapping("/signup")
    public ResponseEntity<Object> registerUser(@Valid @RequestBody SignUpRequest signUpRequest,BindingResult bindingResult){
            ResponseEntity<Object> erros = responseErrorValidator.mapValidationService(bindingResult);
            if (!ObjectUtils.isEmpty(erros)) return erros;

            System.out.println(signUpRequest.toString());
            personValidator.validate(signUpRequest);
            userService.createUser(signUpRequest);
            return ResponseEntity.ok(new MessageResponse("User registered successfully"));
    }

    @PostMapping("/signin")
    public ResponseEntity<Object> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, BindingResult bindingResult) {
        ResponseEntity<Object> errors = responseErrorValidator.mapValidationService(bindingResult);
        if (!ObjectUtils.isEmpty(errors)) return errors;

        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(),
                loginRequest.getPassword()
        ));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = SecurityConstants.TOKEN_PREFIX + jwtTokenProvider.generateToken(authentication);

        return ResponseEntity.ok(new JWTTokenSuccessResponse(true, jwt));
    }


}
