package com.example.instaKing.repositories;

import com.example.instaKing.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    List<User> findAllByFollowers_Username(String username);

    List<User> findAllByFollowing_Username(String username);
}
