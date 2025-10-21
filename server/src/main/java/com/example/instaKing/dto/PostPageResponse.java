package com.example.instaKing.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class PostPageResponse {
    private List<PostDTO> comments;
    private long totalElements;
    private int totalPages;
    private int pageNumber;
    private int pageSize;
}
