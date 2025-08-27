package com.example.instaKing.security;

import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.security.Key;

public class SecurityConstants {

    public static final String SIGN_UP_URLS = "/api/auth/**";


    public static final Key ACCESS_SECRET = Keys.secretKeyFor(SignatureAlgorithm.HS512);
    public static final Key REFRESH_SECRET =Keys.secretKeyFor(SignatureAlgorithm.HS512);
    public static final String TOKEN_PREFIX = "Bearer ";

    public static final String HEADER_STRING = "Authorization";


    public static final String UPLOAD_DIR = "uploads/";

    public static final long ACCESS_EXPIRATION_TIME = 1000*60;
    public static final long REFRESH_EXPIRATION_TIME =1000L*60*60*24*7;
}
