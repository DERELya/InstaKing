package com.example.instaKing.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FavoriteDTO {
    private PostDTO post;
    private LocalDateTime addedAt;
}
