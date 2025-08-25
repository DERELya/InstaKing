package com.example.instaKing.dto;

import com.example.instaKing.dto.CommentDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class CommentPageResponse {
    private List<CommentDTO> comments;
    private long totalElements;
    private int totalPages;
    private int pageNumber;
    private int pageSize;
}
