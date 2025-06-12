package com.example.instaKing.security;

import com.example.instaKing.models.User;
import com.example.instaKing.services.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;


@Component
public class JWTAuthenticationFilter extends OncePerRequestFilter {
    private final JWTTokenProvider tokenProvider;
    private final CustomUserDetailsService customUserDetailsService;

    @Autowired
    public JWTAuthenticationFilter(JWTTokenProvider tokenProvider, CustomUserDetailsService customUserDetailsService) {
        this.tokenProvider = tokenProvider;
        this.customUserDetailsService = customUserDetailsService;
    }

    public static final Logger LOGGER = LoggerFactory.getLogger(JWTAuthenticationFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException,AuthenticationException {

        LOGGER.info("JWT filter triggered for URI: {}", request.getRequestURI());

        try {
            String jwt = getJWTFromRequest(request);
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                Long userId = tokenProvider.getUserIdFromToken(jwt);
                User userDetails = customUserDetailsService.loadUserById(userId);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, Collections.emptyList());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                LOGGER.info("Аутентификация прошла: {}", userDetails.getUsername());
                SecurityContextHolder.getContext().setAuthentication(authentication);

            }
            if (!StringUtils.hasText(jwt)) {
                LOGGER.warn("JWT отсутствует — пользователь анонимный");
                filterChain.doFilter(request, response);
                return;
            }

            // переносим сюда
        } catch (AuthenticationException ex) {
            System.out.println("daun");
            SecurityContextHolder.clearContext(); // на всякий случай
            LOGGER.error("Ошибка аутентификации: {}", ex.getMessage());
            // передаём ошибку дальше, чтобы её перехватил AuthenticationEntryPoint
            throw ex;
        }

        filterChain.doFilter(request, response);
    }

    private String getJWTFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader(SecurityConstants.HEADER_STRING);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            return bearerToken.split(" ")[1];
        }
        return null;
    }
}
