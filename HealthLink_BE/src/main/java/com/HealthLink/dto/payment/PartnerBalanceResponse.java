package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO trả về thông tin số dư tài khoản của đối tác (Doctor / Pharmacy).
 *
 * <ul>
 *   <li>{@code pendingBalance}  – Số dư chờ rút hiện tại (USD)</li>
 *   <li>{@code totalEarnings}   – Tổng thu nhập tích lũy từ trước đến nay (USD)</li>
 *   <li>{@code eligibleForWithdrawal} – true nếu pendingBalance &ge; $10.00</li>
 *   <li>{@code withdrawalStatus}      – Thông báo mô tả trạng thái đủ điều kiện</li>
 * </ul>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerBalanceResponse {

    /** ID đối tác */
    private String partnerId;

    /** Loại đối tác: DOCTOR hoặc PHARMACY */
    private String partnerType;

    /** Tên đối tác */
    private String partnerName;

    /** Số dư chờ rút hiện tại (USD) */
    private BigDecimal pendingBalance;

    /** Tổng thu nhập tích lũy từ trước đến nay (USD) */
    private BigDecimal totalEarnings;

    /** true nếu pendingBalance &ge; $10.00 (đủ điều kiện rút tiền) */
    private boolean eligibleForWithdrawal;

    /** Thông báo trạng thái đủ điều kiện rút tiền */
    private String withdrawalStatus;
}
