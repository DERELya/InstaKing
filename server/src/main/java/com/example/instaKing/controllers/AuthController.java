package com.example.instaKing.controllers;

import jakarta.persistence.PrePersist;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin
@PreAuthorize("permitAll()")
@RequestMapping("/api/auth")
public class AuthController {


}
