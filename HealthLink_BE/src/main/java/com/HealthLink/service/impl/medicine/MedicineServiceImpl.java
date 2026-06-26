package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineRequest;
import com.HealthLink.dto.medicine.MedicineResponse;
import com.HealthLink.entity.Medicine;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.service.medicine.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MedicineServiceImpl implements MedicineService {

    private final MedicineRepository medicineRepository;

    @Override
    public List<MedicineResponse> searchMedicines(String keyword) {
        List<Medicine> medicines;
        if (keyword == null || keyword.isBlank()) {
            medicines = medicineRepository.findByActiveTrue();
        } else {
            medicines = medicineRepository.findByNameContainingIgnoreCaseAndActiveTrue(keyword);
        }
        return medicines.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public MedicineResponse getMedicineById(Integer medicineId) {
        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine", "id", medicineId));
        return toResponse(medicine);
    }

    @Override
    @Transactional
    public MedicineResponse addMedicine(MedicineRequest medicine) {
        Medicine saved = medicineRepository.save(toEntity(medicine));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public MedicineResponse updateMedicine(Integer medicineId, MedicineRequest medicine) {
        Medicine existing = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine", "id", medicineId));

        existing.setName(medicine.getName());
        existing.setGenericName(medicine.getGenericName());
        existing.setBrandName(medicine.getBrandName());
        existing.setCategory(medicine.getCategory());
        existing.setDosageForm(medicine.getDosageForm());
        existing.setStrength(medicine.getStrength());
        existing.setUnit(medicine.getUnit());
        existing.setManufacturer(medicine.getManufacturer());
        existing.setCountryOfOrigin(medicine.getCountryOfOrigin());
        existing.setDescription(medicine.getDescription());
        existing.setActiveIngredients(medicine.getActiveIngredients());
        existing.setIndications(medicine.getIndications());
        existing.setContraindications(medicine.getContraindications());
        existing.setSideEffects(medicine.getSideEffects());
        existing.setPrecautions(medicine.getPrecautions());
        existing.setInteractions(medicine.getInteractions());
        existing.setStorageConditions(medicine.getStorageConditions());
        existing.setPrescriptionRequired(medicine.isPrescriptionRequired());
        existing.setPrice(medicine.getPrice());
        existing.setActive(medicine.isActive());
        existing.setImageUrl(medicine.getImageUrl());

        Medicine updated = medicineRepository.save(existing);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteMedicine(Integer medicineId) {
        Medicine existing = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine", "id", medicineId));
        medicineRepository.delete(existing);
    }

    // -------------------------------------------------------------------------
    // Mapper
    // -------------------------------------------------------------------------
    private MedicineResponse toResponse(Medicine m) {
        return MedicineResponse.builder()
                .medicineId(m.getMedicineId())
                .name(m.getName())
                .genericName(m.getGenericName())
                .brandName(m.getBrandName())
                .category(m.getCategory())
                .dosageForm(m.getDosageForm())
                .strength(m.getStrength())
                .unit(m.getUnit())
                .manufacturer(m.getManufacturer())
                .countryOfOrigin(m.getCountryOfOrigin())
                .description(m.getDescription())
                .activeIngredients(m.getActiveIngredients())
                .indications(m.getIndications())
                .contraindications(m.getContraindications())
                .sideEffects(m.getSideEffects())
                .precautions(m.getPrecautions())
                .interactions(m.getInteractions())
                .storageConditions(m.getStorageConditions())
                .prescriptionRequired(m.isPrescriptionRequired())
                .price(m.getPrice())
                .active(m.isActive())
                .imageUrl(m.getImageUrl())
                .build();
    }

    private Medicine toEntity(MedicineRequest r) {
        return Medicine.builder()
                .medicineId(r.getMedicineId())
                .name(r.getName())
                .genericName(r.getGenericName())
                .brandName(r.getBrandName())
                .category(r.getCategory())
                .dosageForm(r.getDosageForm())
                .strength(r.getStrength())
                .unit(r.getUnit())
                .manufacturer(r.getManufacturer())
                .countryOfOrigin(r.getCountryOfOrigin())
                .description(r.getDescription())
                .activeIngredients(r.getActiveIngredients())
                .indications(r.getIndications())
                .contraindications(r.getContraindications())
                .sideEffects(r.getSideEffects())
                .precautions(r.getPrecautions())
                .interactions(r.getInteractions())
                .storageConditions(r.getStorageConditions())
                .prescriptionRequired(r.isPrescriptionRequired())
                .price(r.getPrice())
                .active(r.isActive())
                .imageUrl(r.getImageUrl())
                .build();
    }
}
