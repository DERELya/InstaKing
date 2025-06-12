package com.example.instaKing.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class CommentDTO {
    private Long id;
    private String username;
    @NotEmpty
    private String message;

}
