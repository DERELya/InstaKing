package com.example.instaKing.repositories;

import com.example.instaKing.models.Conversation;
import com.example.instaKing.models.Message;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
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
    // Поиск сообщений с пагинацией
    Page<Message> findByConversationId(Long conversationId, Pageable pageable);

    // Поиск самого последнего сообщения
    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(Long conversationId);

    // Подсчет непрочитанных (где я не отправитель и статус SENT)
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :convId " +
            "AND m.sender.id != :userId AND m.status = 'SENT'")
    int countUnreadMessages(@Param("convId") Long conversationId, @Param("userId") Long userId);

    // Массовое обновление статуса на READ
    @Modifying
    @Query("UPDATE Message m SET m.status = 'READ' WHERE m.conversation.id = :convId " +
            "AND m.sender.id != :userId AND m.status = 'SENT'")
    void markMessagesAsReadInConversation(@Param("convId") Long conversationId, @Param("userId") Long userId);
}
