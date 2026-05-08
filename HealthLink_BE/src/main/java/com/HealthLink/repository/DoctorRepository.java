package com.HealthLink.repository;

import com.HealthLink.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

// Hỗ trợ tìm kiếm bác sĩ theo chuyên khoa và tên
@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {

    /**
     * Tìm bác sĩ theo filter chuyên khoa và/hoặc tên.
     * Nếu tham số null thì bỏ qua điều kiện đó.
     *
     * @param specialty tên chuyên khoa (tìm kiếm gần đúng)
     * @param name      tên bác sĩ (tìm kiếm gần đúng)
     */
    @Query("SELECT d FROM Doctor d LEFT JOIN d.specialtyEntity se WHERE " +
           "(:specialty IS NULL OR se.name LIKE %:specialty%) AND " +
           "(:name IS NULL OR d.fullName LIKE %:name%)")
    List<Doctor> findByFilters(@Param("specialty") String specialty,
                               @Param("name") String name);
}
