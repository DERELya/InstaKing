package com.example.instaKing.repositories;

import com.example.instaKing.models.Story;
import com.example.instaKing.models.StoryView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    List<StoryView> getStoryViewByStory(Story story);
}
