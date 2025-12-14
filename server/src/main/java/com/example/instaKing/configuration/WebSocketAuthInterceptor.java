package com.example.instaKing.configuration;

import com.example.instaKing.models.User;
import com.example.instaKing.security.JWTTokenProvider;
import com.example.instaKing.security.SecurityConstants;
import com.example.instaKing.services.CustomUserDetailsService;
import org.hibernate.tool.schema.internal.exec.ScriptTargetOutputToFile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JWTTokenProvider tokenProvider;
    private final CustomUserDetailsService customUserDetailsService;

    @Autowired
    public WebSocketAuthInterceptor(JWTTokenProvider tokenProvider, CustomUserDetailsService customUserDetailsService) {
        this.tokenProvider = tokenProvider;
        this.customUserDetailsService = customUserDetailsService;
    }
    private static final String BEARER_URL_ENCODED = "Bearer%20";
    private static final String BEARER_SPACE = "Bearer ";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);


        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

            String jwt = null;
            String authorizationHeader = accessor.getFirstNativeHeader("Authorization");

            if (authorizationHeader != null) {
                String header = authorizationHeader.trim();
                if (header.startsWith(BEARER_URL_ENCODED)) {
                    jwt = header.substring(BEARER_URL_ENCODED.length());
                } else if (header.startsWith(BEARER_SPACE)) {
                    jwt = header.substring(BEARER_SPACE.length());
                }
            }

            if (jwt != null) {
                try {
                    if (tokenProvider.validateToken(jwt, false, SecurityConstants.ACCESS_SECRET)) {
                        Long userId = tokenProvider.getUserIdFromToken(jwt, false, SecurityConstants.ACCESS_SECRET);
                        UserDetails userDetails = customUserDetailsService.loadUserById(userId);

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                        accessor.setUser(authentication);

                        System.out.println("PIZDA: Authentication SUCCESSFUL via Header! User: " + userId);
                    }
                } catch (Exception e) {
                    System.err.println("PIZDA: Exception during Header JWT processing: " + e.getMessage());
                }
            } else {
                System.err.println("PIZDA: JWT not found in Authorization header.");
            }
        }

        return message;
    }
}