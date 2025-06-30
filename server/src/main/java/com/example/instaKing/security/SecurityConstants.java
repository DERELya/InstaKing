package com.example.instaKing.security;

import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.security.Key;

public class SecurityConstants {

    public static final String SIGN_UP_URLS = "/api/auth/**";


    public static final Key SECRET = Keys.secretKeyFor(SignatureAlgorithm.HS512);
    public static final String TOKEN_PREFIX = "Bearer ";

    public static final String HEADER_STRING = "Authorization";


    public static final String UPLOAD_DIR = "uploads/";

    public static final long EXPIRATION_TIME = 600_000; //10 min
}
