package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "Doctors")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Doctor {
    @Id
    @Column(name = "DoctorID", length = 450)
    private String doctorId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "DoctorID")
    private User user;

    @Column(name = "FullName", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String fullName;

    // --- 1. THÔNG TIN CHUYÊN MÔN (Professional Info) ---

    @Column(nullable = false)
    private String qualifications; // Bằng cấp, chứng chỉ chuyên môn (VD: "Tiến sĩ Y khoa", "BS CKI")

    @Column(nullable = false)
    private String specialty; // Chuyên khoa phụ trách (VD: "Tim mạch", "Nhi khoa", "Da liễu")

    private Integer yearsOfExperience; // Số năm kinh nghiệm làm việc thực tế trong ngành y
    
    @Column(nullable = false)
    private String languageSpoken; // Các ngôn ngữ bác sĩ có thể sử dụng giao tiếp (VD: "Tiếng Việt, Tiếng Anh")
    
    @Column(length = 2000)
    private String bio; // Tiểu sử, đoạn giới thiệu chi tiết về kinh nghiệm của bác sĩ (Tối đa 2000 ký tự)

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String avatarUrl; // Đường dẫn tới ảnh đại diện/chân dung của bác sĩ

    // --- 2. THÔNG TIN PHÒNG KHÁM & ĐỊA ĐIỂM (Location & Clinic) ---

    @Column(nullable = false)
    private String location; // Tỉnh/Thành phố hoạt động chính (VD: "Hồ Chí Minh")

    private Double latitude; // Vĩ độ của phòng khám (Dùng để app gợi ý bác sĩ gần bệnh nhân nhất)
    private Double longitude; // Kinh độ của phòng khám
    
    private String clinicName; // Tên phòng khám hoặc bệnh viện đang công tác (VD: "Bệnh viện Chợ Rẫy")
    private String clinicAddress; // Địa chỉ cụ thể của phòng khám đó

    // --- 3. DỊCH VỤ & CHI PHÍ KHÁM (Services & Fees) ---
    
    private BigDecimal consultationFee; // Phí khám/tư vấn mặc định cho mỗi lượt đặt lịch
    
    @Builder.Default
    private boolean availableForVideo = true; // Cho phép bệnh nhân đặt lịch khám qua Video Call
    
    @Builder.Default
    private boolean availableForAudio = true; // Cho phép bệnh nhân đặt lịch gọi điện thoại (Audio)
    
    @Builder.Default
    private boolean availableForChat = true; // Cho phép bệnh nhân đặt lịch tư vấn qua nhắn tin
    
    @Builder.Default
    private boolean availableForOffline = true; // Cho phép bệnh nhân đặt lịch đến khám trực tiếp tại phòng khám

    // --- 4. TRẠNG THÁI & ĐÁNH GIÁ (Status & Ratings) ---

    @Builder.Default
    private boolean verified = false; // Trạng thái Admin đã kiểm duyệt bằng cấp, chứng chỉ hợp pháp hay chưa
    
    private Double averageRating; // Điểm đánh giá trung bình từ các bệnh nhân cũ (VD: 4.8/5 sao)
    private Integer totalReviews; // Tổng số lượt bệnh nhân đã để lại đánh giá cho bác sĩ này

    // --- 5. TÀI CHÍNH & HOA HỒNG (Commission & Finance) ---

    @Column(precision = 5, scale = 4)
    private BigDecimal customCommissionRate; // Tỉ lệ % app thu phí riêng cho bác sĩ này (nếu khác với mức chung)

    @Column(length = 20)
    @Builder.Default
    private String commissionTier = "STANDARD";  // Hạng đối tác (STANDARD, PREMIUM, VIP) để tính chiết khấu

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = java.math.BigDecimal.ZERO; // Tổng doanh thu bác sĩ đã kiếm được qua hệ thống

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal pendingSettlement = java.math.BigDecimal.ZERO; // Số tiền hệ thống đang giữ, chờ quyết toán để chuyển khoản cho bác sĩ

    @Column(length = 50)
    private String bankAccount; // Số tài khoản ngân hàng để nhận tiền thanh toán từ app

    @Column(length = 100)
    private String bankName; // Tên ngân hàng (VD: "Vietcombank", "MB Bank")

    @Column(length = 255)
    private String paypalEmail; // Email PayPal (Dành cho bác sĩ nhận tiền thanh toán quốc tế)

    // --- Relationships ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialtyId")
    private Specialty specialtyEntity;

    @OneToMany(mappedBy = "doctor")
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "doctor")
    private List<Review> reviews;

    @OneToMany(mappedBy = "sharedWithDoctor")
    private List<HealthRecordShare> sharedRecords;

    @OneToMany(mappedBy = "doctor")
    private List<DoctorSchedule> schedules;
}