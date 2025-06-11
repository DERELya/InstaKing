package com.example.instaKing.security;

import com.example.instaKing.models.User;
import io.jsonwebtoken.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JWTTokenProvider {

    public static final Logger LOGGER = LoggerFactory.getLogger(JWTTokenProvider.class);

    public String generateToken(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Date now = new Date(System.currentTimeMillis());
        Date expiryDate = new Date(now.getTime() + SecurityConstants.EXPIRATION_TIME);

        String userId=Long.toString(user.getId());
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", user.getUsername());
        claims.put("name", user.getName());
        claims.put("lastname", user.getLastname());
        return Jwts.builder()
                .setSubject(userId)
                .addClaims(claims)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, SecurityConstants.SECRET)
                .compact();
    }

    public Boolean validateToken(String token)  {
        try {
            Jwts.parser()
                    .setSigningKey(SecurityConstants.SECRET)
                    .build()
                    .parseClaimsJws(token);
            return true;
        }catch (MalformedJwtException|
                ExpiredJwtException|
                UnsupportedJwtException|
                IllegalArgumentException e){
            LOGGER.error(e.getMessage());
            return false;
        }

    }

    public Long getUserIdFromToken(String token) {
            Claims claims= Jwts.parser()
                    .setSigningKey(SecurityConstants.SECRET)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            String id=(String)claims.get("userId");
            return Long.parseLong(id);
    }
}
