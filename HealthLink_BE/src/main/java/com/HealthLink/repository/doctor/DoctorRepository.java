package com.HealthLink.repository.doctor;

import com.HealthLink.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// Hỗ trợ tìm kiếm bác sĩ theo chuyên khoa và tên
@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {

    /**
     * Tìm bác sĩ theo filter chuyên khoa và/hoặc tên. Nếu tham số null thì bỏ
     * qua điều kiện đó.
     *
     * @param specialty tên chuyên khoa (tìm kiếm gần đúng)
     * @param name tên bác sĩ (tìm kiếm gần đúng)
     * @return
     */
    @Query("SELECT d FROM Doctor d LEFT JOIN d.specialtyEntity se WHERE "
            + "(:specialty IS NULL OR se.name LIKE %:specialty% "
            + "    OR (se IS NULL AND d.specialty LIKE %:specialty%)) AND "
            + "(:name IS NULL OR d.fullName LIKE %:name%)")
    List<Doctor> findByFilters(@Param("specialty") String specialty,
                               @Param("name") String name);

    /**
     * Tìm Doctor kèm User (JOIN FETCH) để tránh LazyInitializationException
     * với @OneToOne @MapsId khi dùng ngoài transaction.
     */
    @Query("SELECT d FROM Doctor d JOIN FETCH d.user WHERE d.doctorId = :doctorId")
    Optional<Doctor> findByIdWithUser(@Param("doctorId") String doctorId);
            @Param("name") String name);
}

