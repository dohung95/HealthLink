package com.HealthLink.service.medicine;

import com.HealthLink.dto.medicine.MedicineRequest;
import com.HealthLink.dto.medicine.MedicineResponse;

import java.util.List;

public interface MedicineService {

    /**
     * Tìm kiếm thuốc theo tên (không phân biệt hoa thường).
     * Nếu keyword rỗng, trả về toàn bộ thuốc đang hoạt động.
     */
    List<MedicineResponse> searchMedicines(String keyword);

    /**
     * Lấy thông tin thuốc theo ID.
     */
    MedicineResponse getMedicineById(Integer medicineId);


    /**
     * Thêm thuốc vào danh sách thuốc.
     */
    MedicineResponse addMedicine(MedicineRequest medicine);


    /**
     * Cập nhật thông tin thuốc.
     */
    MedicineResponse updateMedicine(Integer medicineId, MedicineRequest medicine);


    /**
     * Xóa thuốc khỏi danh sách thuốc.
     */
    void deleteMedicine(Integer medicineId);
}
