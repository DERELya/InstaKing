package com.example.instaKing.repositories;

import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message,Long> {
    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);
}
