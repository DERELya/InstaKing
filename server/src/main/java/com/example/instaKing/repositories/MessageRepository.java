package com.example.instaKing.repositories;

import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message,Long> {

    List<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    //обновление статуса сообщения
    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.status = 'READ' WHERE m.conversation.id = :conversationId AND m.sender.id <> :readerId AND m.status <> 'READ'")
    void markMessagesAsReadInConversation(
            @Param("conversationId") Long conversationId,
            @Param("readerId") Long readerId
    );

    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(Long conversationId);

    // 2. Для подсчета UnreadCount (Непрочитанные сообщения)
    @Query("SELECT COUNT(m.id) FROM Message m " +
            "WHERE m.conversation.id = :conversationId " +
            "AND m.status = 'SENT' " + // Или UNREAD, если вы используете READ/UNREAD
            "AND m.sender.id <> :currentUserId") // Сообщения, отправленные НЕ текущим пользователем
    long countUnreadMessagesInConversation(
            @Param("conversationId") Long conversationId,
            @Param("currentUserId") Long currentUserId
    );
}
