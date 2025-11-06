package com.example.instaKing.dto;

import com.example.instaKing.models.enums.StoryVisibility;
import lombok.Data;

@Data
public class ResponseForStoryMain {

    private String username;
    private boolean viewed;
    private StoryVisibility visibility;

}
