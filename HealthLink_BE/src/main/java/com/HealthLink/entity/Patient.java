package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Patients")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Patient {
    @Id
    @Column(name = "PatientID", length = 450)
    private String patientId; // ID của bệnh nhân (khớp 1-1 với ID trong bảng Users)

    @OneToOne
    @MapsId
    @JoinColumn(name = "PatientID")
    @ToString.Exclude
    private User user; // Liên kết 1-1 tới tài khoản User

    @Column(name = "FullName", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String fullName; // Họ và tên đầy đủ của bệnh nhân

    private LocalDateTime dateOfBirth; // Ngày tháng năm sinh
    
    @Column(columnDefinition = "TEXT")
    private String medicalHistorySummary; // Tóm tắt lịch sử y khoa/bệnh án trước đây
    
    private String insuranceProvider; // Công ty/nhà cung cấp bảo hiểm y tế
    private String insurancePolicyNumber; // Số thẻ/số hợp đồng bảo hiểm y tế
    
    @Column(length = 10)
    private String gender; // Giới tính (Nam, Nữ, Khác)
    
    @Nationalized
    private String address; // Địa chỉ chi tiết (số nhà, tên đường...)
    @Nationalized
    private String city; // Thành phố / Tỉnh
    @Nationalized
    private String country; // Quốc gia
    
    @Column(length = 10)
    private String bloodType; // Nhóm máu (ví dụ: A+, O-, AB...)
    
    private String emergencyContactName; // Tên người liên hệ trong trường hợp khẩn cấp
    private String emergencyContactPhone; // Số điện thoại người liên hệ khẩn cấp
    private String emergencyContactRelationship; // Mối quan hệ với người liên hệ khẩn cấp (bố, mẹ, vợ...)
    private String preferredLanguage; // Ngôn ngữ ưu tiên giao tiếp (ví dụ: Tiếng Việt, Tiếng Anh)
    private String preferredContactMethod; // Phương thức liên hệ ưu tiên (Email, Phone, SMS...)
    private String occupation; // Nghề nghiệp của bệnh nhân
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String avatarUrl; // Đường dẫn URL tới ảnh đại diện của bệnh nhân
    
    private Double latitude; // Vĩ độ của bệnh nhân (phục vụ tính khoảng cách tới phòng khám)
    private Double longitude; // Kinh độ của bệnh nhân (phục vụ tính khoảng cách tới phòng khám)
    
    @Column(length = 1000)
    private String allergies; // Thông tin về dị ứng (dị ứng thuốc, dị ứng thức ăn, thời tiết...)
    
    @Column(length = 1000)
    private String chronicConditions; // Bệnh mãn tính (ví dụ: Tiểu đường, Cao huyết áp...)
    
    @Column(length = 1000)
    private String currentMedications; // Các loại thuốc đang sử dụng hiện tại
    
    private Double heightCm; // Chiều cao (đơn vị: cm)
    private Double weightKg; // Cân nặng (đơn vị: kg)

    // --- Relationships ---
    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Review> reviews;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<HealthRecord> healthRecords;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Invoice> invoices;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PrescriptionHeader> prescriptionHeaders;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PharmacyConsultationRequest> pharmacyConsultationRequests;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<VitalSign> vitalSigns;
}
