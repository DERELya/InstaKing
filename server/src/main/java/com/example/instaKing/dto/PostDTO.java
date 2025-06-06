package com.example.instaKing.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
public class PostDTO {

    private Long id;
    @NotEmpty
    private String title;

    private String location;
    private String caption;
    @NotEmpty
    private String username;
    @NotEmpty
    private Integer likes;

    private Set<String> usersLiked;
}
