package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Entity
@Table(name = "Pharmacies")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Pharmacy {
    @Id
    @Column(name = "PharmacyID", length = 450)
    private String pharmacyId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "PharmacyID")
    private User user;

    @Column(nullable = false, length = 200)
    private String name;

    // --- 1. THÔNG TIN PHÁP LÝ & ĐỊA CHỈ (Identification & Location) ---
    
    @Column(nullable = false, length = 100)
    private String licenseNumber; // Số giấy phép kinh doanh/hoạt động do Sở Y Tế cấp (Bắt buộc)

    @Column(nullable = false, length = 500)
    private String address; // Địa chỉ chi tiết của nhà thuốc (Số nhà, tên đường) (Bắt buộc)

    @Column(length = 100)
    private String city; // Thành phố / Tỉnh
    
    @Column(length = 100)
    private String district; // Quận / Huyện
    
    @Column(length = 100)
    private String ward; // Phường / Xã

    private Double latitude; // Vĩ độ (Tọa độ trên Google Maps để tính khoảng cách giao hàng)
    private Double longitude; // Kinh độ (Tọa độ trên Google Maps)

    // --- 2. THÔNG TIN LIÊN HỆ & HIỂN THỊ (Contact & Profile) ---

    @Column(length = 20)
    private String phoneNumber; // Số điện thoại đường dây nóng của nhà thuốc
    
    private String email; // Email liên hệ hỗ trợ

    @Column(length = 1000)
    private String description; // Đoạn mô tả giới thiệu về quy mô, uy tín của nhà thuốc
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String avatarUrl; // Đường dẫn (link) tới logo hoặc ảnh mặt tiền của nhà thuốc

    // --- 3. THỜI GIAN HOẠT ĐỘNG (Operating Hours) ---

    private LocalTime openTime; // Giờ bắt đầu mở cửa (VD: 07:00)
    private LocalTime closeTime; // Giờ đóng cửa (VD: 22:30)
    
    @Column(name = "Open24Hours")
    @Builder.Default
    private boolean open24Hours = false; // Đánh dấu nhà thuốc có mở cửa xuyên đêm 24/7 hay không

    @Column(length = 50)
    private String workingDays; // Các ngày làm việc trong tuần (VD: "Mon-Sun" hoặc "Thứ 2 - Thứ 7")

    // --- 4. TRẠNG THÁI & ĐÁNH GIÁ (Status & Rating) ---

    @Column(name = "Verified")
    @Builder.Default
    private boolean verified = false; // Trạng thái Admin đã kiểm duyệt giấy phép thành công chưa
    
    @Column(name = "Active")
    @Builder.Default
    private boolean active = true; // Trạng thái đang hoạt động (Tắt đi nếu nhà thuốc tạm nghỉ)
    
    @Column(name = "AverageRating")
    private Double averageRating; // Điểm đánh giá trung bình từ khách hàng (VD: 4.8 sao)
    
    @Column(name = "TotalReviews")
    private Integer totalReviews; // Tổng số lượt khách mua thuốc đã để lại đánh giá

    // --- 5. CHÍNH SÁCH VẬN CHUYỂN (Delivery Policies) ---

    @Column(name = "DeliveryAvailable")
    @Builder.Default
    private boolean deliveryAvailable = true; // Nhà thuốc có hỗ trợ ship thuốc tận nhà không
    
    @Column(name = "DeliveryRadius")
    private Double deliveryRadius; // Bán kính giao hàng tối đa chấp nhận ship (Tính bằng Km, VD: 5.0)
    
    @Column(name = "DeliveryFee")
    private BigDecimal deliveryFee; // Phí giao hàng mặc định (VD: 20,000 VNĐ)

    // --- 6. METADATA (Hệ thống tự quản lý) ---

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now(); // Thời điểm tạo tài khoản nhà thuốc này
    
    private LocalDateTime updatedAt; // Thời điểm cập nhật thông tin gần nhất

    // --- 7. TÀI CHÍNH & HOA HỒNG (Commission & Finance) ---
    // (Phần này giống hệt bác sĩ, dùng để app tính chiết khấu khi bán được thuốc)

    @Column(precision = 5, scale = 4)
    private BigDecimal customCommissionRate; // Tỉ lệ % app thu phí rêng cho nhà thuốc này (nếu có)

    @Column(length = 20)
    @Builder.Default
    private String commissionTier = "STANDARD";  // Hạng đối tác (STANDARD, PREMIUM, VIP) để nhận ưu đãi phí

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = BigDecimal.ZERO; // Tổng doanh thu nhà thuốc đã bán được qua app

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal pendingSettlement = BigDecimal.ZERO; // Số tiền app đang giữ, chờ đối soát để chuyển trả cho nhà thuốc

    @Column(length = 50)
    private String bankAccount; // Số tài khoản ngân hàng của chủ nhà thuốc để nhận tiền đối soát

    @Column(length = 100)
    private String bankName; // Tên ngân hàng (VD: Techcombank, ACB)

    @Column(length = 255)
    private String paypalEmail; // Email PayPal (Dùng nếu nhà thuốc muốn nhận tiền qua cổng quốc tế)

    @OneToMany(mappedBy = "pharmacy")
    @ToString.Exclude
    private List<PharmacyOrder> pharmacyOrders;

    @OneToMany(mappedBy = "pharmacy")
    @ToString.Exclude
    private List<PharmacyConsultationRequest> consultationRequests;
}
