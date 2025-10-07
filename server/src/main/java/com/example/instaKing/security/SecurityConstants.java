package com.example.instaKing.security;

import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;

import java.security.Key;

public class SecurityConstants {

    public static final String SIGN_UP_URLS = "/api/auth/**";


    public static final Key ACCESS_SECRET = loadOrGenerateKey("JWT_ACCESS_SECRET_BASE64");
    public static final Key REFRESH_SECRET = loadOrGenerateKey("JWT_REFRESH_SECRET_BASE64");
    public static final String TOKEN_PREFIX = "Bearer ";

    public static final String HEADER_STRING = "Authorization";


    public static final String UPLOAD_DIR = "uploads/";

    public static final long ACCESS_EXPIRATION_TIME = 1000*60*15;
    public static final long REFRESH_EXPIRATION_TIME =1000L*60*60*24*7;

    private static Key loadOrGenerateKey(String envVarName) {
        String base64 = System.getenv(envVarName);
        if (base64 == null || base64.isBlank()) {
            base64 = System.getProperty(envVarName);
        }
        if (base64 != null && !base64.isBlank()) {
            return Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64));
        }
        return Keys.secretKeyFor(SignatureAlgorithm.HS512);
    }
}
