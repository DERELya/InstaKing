package com.example.instaKing.services;

import com.example.instaKing.models.User;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Autowired
    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }


    @Override
    public UserDetails loadUserByUsername(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(()->new UsernameNotFoundException("UserService not found with username"+email));
        return build(user);
    }

    public User loadUserById(long id) {
        return userRepository.findById(id).orElse(null);
    }

    public static User build(User user) {
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role->new SimpleGrantedAuthority(role.name()))
                .collect(Collectors.toList());
        return new User(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }

}
