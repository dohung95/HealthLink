package com.HealthLink.repository.chat;

import com.HealthLink.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {

    /**
     * Tìm phòng chat giữa 2 người dùng (không phân biệt thứ tự user1/user2).
     */
    @Query("SELECT cr FROM ChatRoom cr WHERE " +
           "(cr.user1Id = :a AND cr.user2Id = :b) OR " +
           "(cr.user1Id = :b AND cr.user2Id = :a)")
    Optional<ChatRoom> findByUsers(@Param("a") String userId1,
                                   @Param("b") String userId2);

    /**
     * Lấy tất cả phòng chat của một người dùng, sắp xếp theo tin nhắn mới nhất.
     */
    @Query("SELECT cr FROM ChatRoom cr WHERE cr.user1Id = :userId OR cr.user2Id = :userId " +
           "ORDER BY cr.lastMessageAt DESC NULLS LAST")
    List<ChatRoom> findAllByUserId(@Param("userId") String userId);

    /**
     * Tìm phòng chat theo appointmentId.
     */
    Optional<ChatRoom> findByAppointment_AppointmentId(Integer appointmentId);
}
