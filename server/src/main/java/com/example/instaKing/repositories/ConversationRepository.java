package com.example.instaKing.repositories;

import com.example.instaKing.models.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    //Поиск всех чатов пользователя и сортировка по последнему сообщению
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p.id = :userId ORDER BY c.lastMessageAt DESC")
    List<Conversation> findConversationsByParticipantId(@Param("userId") Long userId);

    //Поиск диалога между двумя пользователями
    @Query("SELECT c FROM Conversation c " +
            "JOIN c.participants p " +
            "WHERE p.id IN :participants " +
            "GROUP BY c " +
            "HAVING COUNT(DISTINCT p) = :count " +
            "AND SIZE(c.participants) = :count")
    Optional<Conversation> findConversationByParticipantsAndCount(
            @Param("participants") List<Long> participants,
            @Param("count") long count
    );

    @Query("SELECT c FROM Conversation c LEFT JOIN FETCH c.participants WHERE c.id = :id")
    Optional<Conversation> findByIdWithParticipants(@Param("id") Long id);
}

