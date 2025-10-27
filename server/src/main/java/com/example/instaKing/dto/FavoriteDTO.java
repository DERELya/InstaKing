package com.example.instaKing.dto;

import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FavoriteDTO {
    private PostDTO post;
    private LocalDateTime addedAt;
}
