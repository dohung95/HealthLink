package com.HealthLink.repository.chat;

import com.HealthLink.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    /**
     * Lấy tất cả tin nhắn trong một phòng chat, sắp xếp theo thời gian tăng dần.
     */
    List<Message> findByChatRoom_ChatRoomIdOrderByTimestampAsc(String chatRoomId);

    /**
     * Đếm số tin nhắn chưa đọc mà một người dùng nhận được trong một phòng chat.
     */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.chatRoomId = :roomId " +
           "AND m.receiver.id = :userId AND m.read = false")
    long countUnread(@Param("roomId") String roomId, @Param("userId") String userId);

    /**
     * Đánh dấu tất cả tin nhắn trong phòng là đã đọc cho người nhận.
     */
    @Modifying
    @Query("UPDATE Message m SET m.read = true WHERE m.chatRoom.chatRoomId = :roomId " +
           "AND m.receiver.id = :userId AND m.read = false")
    int markAllAsRead(@Param("roomId") String roomId, @Param("userId") String userId);
}
