package com.HealthLink.repository.doctor;

import com.HealthLink.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
     * @param location
     * @param pageable
     * @return
     */
    @Query("SELECT d FROM Doctor d LEFT JOIN d.specialtyEntity se WHERE "
            + "(:specialty IS NULL OR se.name LIKE %:specialty% "
            + "    OR (se IS NULL AND d.specialty LIKE %:specialty%)) AND "
            + "(:name IS NULL OR d.fullName LIKE %:name%) AND "
            + "(:location IS NULL OR d.location LIKE %:location%)")
    Page<Doctor> findByFiltersPaged(
            @Param("specialty") String specialty,
            @Param("name") String name,
            @Param("location") String location,
            Pageable pageable
    );

    @Query("SELECT d FROM Doctor d LEFT JOIN d.specialtyEntity se WHERE "
            + "(:specialty IS NULL OR se.name LIKE %:specialty% "
            + "    OR (se IS NULL AND d.specialty LIKE %:specialty%)) AND "
            + "(:name IS NULL OR d.fullName LIKE %:name%)")
    List<Doctor> findByFilters(
            @Param("specialty") String specialty,
            @Param("name") String name
    );

    /**
     * Tìm Doctor kèm User (JOIN FETCH) để tránh LazyInitializationException với
     *
     * @param doctorId
     * @return
     * @OneToOne @MapsId khi dùng ngoài transaction.
     */
    @Query("SELECT d FROM Doctor d JOIN FETCH d.user WHERE d.doctorId = :doctorId")
    Optional<Doctor> findByIdWithUser(@Param("doctorId") String doctorId);

    @Query("""
       SELECT DISTINCT COALESCE(se.name, d.specialty)
       FROM Doctor d
       LEFT JOIN d.specialtyEntity se
       WHERE COALESCE(se.name, d.specialty) IS NOT NULL
       ORDER BY COALESCE(se.name, d.specialty)
       """)
    List<String> findAllSpecialtyNames();

    /**
     * Find Doctor by User ID.
     */
    Optional<Doctor> findByUser_Id(String userId);

    /**
     * Find all doctors with active user accounts.
     * Used for compliance checking.
     */
    List<Doctor> findByUser_Status(String status);
}
