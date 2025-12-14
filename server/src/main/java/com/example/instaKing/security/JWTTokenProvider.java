package com.example.instaKing.security;

import com.example.instaKing.models.User;
import io.jsonwebtoken.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JWTTokenProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(JWTTokenProvider.class);

    public String generateAccessToken(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + SecurityConstants.ACCESS_EXPIRATION_TIME);

        return buildToken(user, now, expiryDate, "access", SecurityConstants.ACCESS_SECRET);
    }

    public String generateRefreshToken(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + SecurityConstants.REFRESH_EXPIRATION_TIME);

        return buildToken(user, now, expiryDate, "refresh", SecurityConstants.REFRESH_SECRET);
    }

    private String buildToken(User user, Date now, Date expiryDate, String type, Key secret) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("tokenType", type);
        if ("access".equals(type)) {
            claims.put("username", user.getUsername());
        }

        return Jwts.builder()
                .setSubject(String.valueOf(user.getId()))
                .addClaims(claims)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
    }

    public boolean validateToken(String token, boolean isRefresh,Key secret) {
        try {
            getClaims(token, isRefresh,secret);
            return true;
        } catch (MalformedJwtException e) {
            LOGGER.error("Невалидный JWT токен: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            LOGGER.error("Срок действия JWT токена истёк: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            LOGGER.error("Неподдерживаемый JWT токен: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            LOGGER.error("Пустое тело JWT токена: {}", e.getMessage());
        }
        return false;
    }

    public Long getUserIdFromToken(String token, boolean isRefresh, Key secret) {
        Object id = getClaims(token, isRefresh,secret).get("userId");
        return Long.parseLong(String.valueOf(id));
    }


    public String getTokenType(String token, boolean isRefresh, Key secret) {
        return String.valueOf(getClaims(token, isRefresh,secret).get("tokenType"));
    }

    private Claims getClaims(String token, boolean isRefresh,Key secret) {
        return Jwts.parser()
                .setSigningKey(secret)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
