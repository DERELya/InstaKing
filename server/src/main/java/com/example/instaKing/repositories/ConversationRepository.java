package com.example.instaKing.repositories;

import com.example.instaKing.models.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    //Поиск всех чатов пользователя и сортировка по последнему сообщению
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p.id = :userId ORDER BY c.lastMessageAt DESC")
    List<Conversation> findConversationsByParticipantId(@Param("userId") Long userId);

    //Поиск диалога между двумя пользователями
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p.id IN :participantsIds GROUP BY c HAVING COUNT(p.id) = 2 AND COUNT(p.id) = :count")
    Optional<Conversation> findConversationByParticipantsIdsAndCount(
            @Param("participantsIds") List<Long> participantsIds,
            @Param("count") long count
    );
}

