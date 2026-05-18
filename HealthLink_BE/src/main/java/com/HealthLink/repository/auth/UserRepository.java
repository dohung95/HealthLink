package com.HealthLink.repository.auth;

import com.HealthLink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    Optional<User> findByPhoneNumber(String phoneNumber);

    boolean existsByEmail(String email);

    /**
     * Tìm tất cả users theo tên role (case-insensitive).
     * Dùng để lấy danh sách Admin users khi gửi notification.
     *
     * @param roleName Tên role (vd: "Admin")
     * @return Danh sách users có role tương ứng
     */
    List<User> findByRole_NameIgnoreCase(String roleName);
}
