# Partner Wallet Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng lịch sử ví thống nhất cho Doctor và Pharmacy, reserve tiền khi rút, cập nhật một withdrawal item theo trạng thái PayPal, tạo `RETURNED` khi payout thất bại và tạo `REFUNDED` khi patient refund.

**Architecture:** `PartnerWalletEntry` là ledger partner-facing và audit trail cho mọi chuyển động số dư; CTX/STL/Payment vẫn là dữ liệu nguồn và các endpoint cũ được giữ tương thích. Các thay đổi số dư dùng pessimistic lock và idempotency key trong transaction ngắn; PayPal được gọi ngoài transaction, sau đó một lifecycle service cập nhật STL và ledger. Web dùng một paged wallet endpoint chung thay vì tự ghép CTX và STL.

**Tech Stack:** Java 17, Spring Boot, Spring Data JPA, SQL Server, JUnit 5/Mockito, React 19, Axios, Bootstrap/Material Symbols, Node test runner.

## Global Constraints

- Áp dụng cho Doctor và Pharmacy web; mobile và admin tiếp tục dùng API CTX/STL hiện tại.
- `pendingSettlement` tiếp tục là số dư khả dụng authoritative và được phép âm; API mới gọi là `availableBalance` nhưng giữ alias `pendingBalance`.
- Không phân bổ withdrawal tùy ý vào CTX; `CommissionTransaction.SETTLED` là trạng thái nội bộ và không xuất hiện trong partner ledger.
- Chỉ PayPal terminal failure đã xác nhận mới sinh `RETURNED`; timeout/kết quả không xác định giữ `PROCESSING`.
- Amount ledger có dấu: tiền vào dương, tiền ra âm.
- Không thêm framework frontend test mới; dùng `node:test` như test hiện có.
- Trước Task 8, executor phải đọc và áp dụng skill `design-taste-frontend-v1` theo `HealthLink_FE/AGENTS.md`; không redesign ngoài wallet transaction surface.

---

### Task 1: Tạo schema, entity và repository cho partner wallet ledger

**Files:**
- Create: `HealthLink_BE/src/main/java/com/HealthLink/entity/enums/PartnerWalletEntryType.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/entity/enums/PartnerWalletEntryStatus.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/entity/PartnerWalletEntry.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/repository/payment/PartnerWalletEntryRepository.java`
- Create: `HealthLink_BE/src/main/resources/db/migration-v21-add-partner-wallet-ledger.sql`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/repository/payment/PartnerWalletEntryRepositoryTest.java`

**Interfaces:**
- Produces `PartnerWalletEntryType { EARNING, WITHDRAWAL, RETURN, REFUND }`.
- Produces `PartnerWalletEntryStatus { PENDING, VESTED, PROCESSING, COMPLETED, FAILED, RETURNED, REFUNDED, CANCELLED }`; `CANCELLED` chỉ dùng nội bộ khi một earning chưa vested bị refund.
- Produces `Optional<PartnerWalletEntry> findByIdempotencyKey(String key)` and paged partner-history query support.

- [ ] **Step 1: Viết repository test thất bại**

  Tạo `@DataJpaTest` kiểm tra unique idempotency key, signed amount âm/dương và query sắp `effectiveAt DESC, entryId DESC`. Dùng hai entry có keys `EARNING:CTX:1` và `WITHDRAWAL:STL:1`; assert duplicate key ném `DataIntegrityViolationException` sau `saveAndFlush`.

- [ ] **Step 2: Chạy test để xác nhận fail**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PartnerWalletEntryRepositoryTest test`

  Expected: FAIL vì entity/repository chưa tồn tại.

- [ ] **Step 3: Tạo enums và entity**

  Entity phải có đúng các field sau:

  ```java
  @Entity
  @Table(name = "PartnerWalletEntries", uniqueConstraints =
      @UniqueConstraint(name = "UK_WalletEntry_Idempotency", columnNames = "IdempotencyKey"))
  public class PartnerWalletEntry {
      @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
      @Column(name = "EntryId") private Long entryId;
      @Column(nullable = false, length = 20) private String partnerType;
      @Column(nullable = false, length = 450) private String partnerId;
      @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
      private PartnerWalletEntryType entryType;
      @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
      private PartnerWalletEntryStatus status;
      @Column(nullable = false, precision = 18, scale = 2) private BigDecimal amount;
      private Integer commissionTransactionId;
      private Integer settlementId;
      private Integer appointmentId;
      private Integer pharmacyOrderId;
      private Integer paymentId;
      @Column(name = "IdempotencyKey", nullable = false, length = 180)
      private String idempotencyKey;
      @Column(length = 500) private String description;
      @Column(nullable = false) private LocalDateTime effectiveAt;
      @Column(nullable = false) private LocalDateTime createdAt;
      @Column(nullable = false) private LocalDateTime updatedAt;
  }
  ```

  Dùng `@PrePersist/@PreUpdate` để set timestamps; không dùng cascade tới CTX/STL để ledger không vô tình sửa dữ liệu nguồn.

- [ ] **Step 4: Tạo repository và migration idempotent**

  Repository thêm `findByIdempotencyKey`, `findBySettlementIdAndEntryType`, và `JpaSpecificationExecutor<PartnerWalletEntry>`. Migration SQL Server phải dùng `IF OBJECT_ID(..., 'U') IS NULL`, tạo indexes `(PartnerId, EffectiveAt DESC)`, `(SettlementId, EntryType)` và unique index `IdempotencyKey`.

  Backfill trong cùng script bằng `INSERT ... SELECT ... WHERE NOT EXISTS`:

  - CTX `PENDING` → `EARNING/PENDING/+NetAmount`, key `EARNING:CTX:<id>`.
  - CTX `VESTED` → `EARNING/VESTED/+NetAmount`, key tương tự.
  - CTX `REFUNDED` có `VestedAt IS NOT NULL` → `REFUND/REFUNDED/-NetAmount`, key `REFUND:CTX:<id>`.
  - CTX `SETTLED` không tạo earning entry.
  - STL `PENDING|PROCESSING` → `WITHDRAWAL/PROCESSING/-NetAmount`.
  - STL `COMPLETED` → `WITHDRAWAL/COMPLETED/-NetAmount`.
  - STL `FAILED|CANCELLED` → `WITHDRAWAL/FAILED/-NetAmount` nhưng không backfill `RETURNED` vì không chứng minh được balance từng bị reserve.

- [ ] **Step 5: Chạy repository test và commit**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PartnerWalletEntryRepositoryTest test`

  Expected: PASS.

  Commit: `feat(wallet): add partner wallet ledger schema`

---

### Task 2: Thêm ledger service và khóa số dư partner

**Files:**
- Create: `HealthLink_BE/src/main/java/com/HealthLink/service/payment/PartnerWalletLedgerService.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/service/impl/payment/PartnerWalletLedgerServiceImpl.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/repository/doctor/DoctorRepository.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/repository/pharmacy/PharmacyRepository.java`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/service/impl/payment/PartnerWalletLedgerServiceImplTest.java`

**Interfaces:**
- Produces `recordPendingEarning(CommissionTransaction tx)`.
- Produces `vestEarning(CommissionTransaction tx)`.
- Produces `cancelPendingEarning(CommissionTransaction tx)`.
- Produces `recordPatientRefund(CommissionTransaction tx, String previousStatus)`.
- Produces `PartnerWalletEntry createWithdrawal(Settlement settlement)`.
- Produces `PartnerWalletEntry updateWithdrawalStatus(Integer settlementId, PartnerWalletEntryStatus status)`.
- Produces `PartnerWalletEntry createReturn(Settlement settlement, String reason)`.

- [ ] **Step 1: Viết service tests thất bại**

  Bao phủ các invariants:

  - Gọi `vestEarning` hai lần chỉ cộng balance và chuyển ledger sang `VESTED` một lần.
  - Refund từ `VESTED` hoặc legacy `SETTLED` tạo `REFUND:CTX:<id>`, trừ balance kể cả xuống âm.
  - Refund từ `PENDING` đổi earning ledger sang `CANCELLED`, không tạo amount âm và không đổi balance.
  - Doctor và Pharmacy dùng cùng quy tắc.

- [ ] **Step 2: Chạy test để xác nhận fail**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PartnerWalletLedgerServiceImplTest test`

  Expected: FAIL vì service chưa tồn tại.

- [ ] **Step 3: Thêm pessimistic-lock repository methods**

  ```java
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select d from Doctor d where d.doctorId = :id")
  Optional<Doctor> findByIdForWalletUpdate(@Param("id") String id);
  ```

  Pharmacy dùng cùng tên method và `pharmacyId`. Không thay đổi `findById` hiện tại.

- [ ] **Step 4: Implement ledger service với idempotency**

  Mỗi public command là `@Transactional`. Trước khi đổi balance, lookup entry bằng key; nếu đã ở terminal state thì return mà không mutate. `vestEarning` lock partner, cộng `tx.netAmount`, update earning entry `PENDING → VESTED`, rồi save partner và entry trong cùng transaction. `recordPatientRefund` dùng key `REFUND:CTX:<id>`, amount `netAmount.negate()`, và không clamp balance tại zero.

  Không đổi `totalEarnings` trong RETURN; patient REFUND giữ hành vi hiện tại của `totalEarnings` trừ khi product có yêu cầu khác. `pendingSettlement` là field duy nhất quyết định withdrawable amount.

- [ ] **Step 5: Chạy tests và commit**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PartnerWalletLedgerServiceImplTest test`

  Expected: PASS.

  Commit: `feat(wallet): record idempotent balance movements`

---

### Task 3: Kết nối commission pending, vesting và patient refund vào ledger

**Files:**
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/service/impl/payment/CommissionServiceImpl.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/entity/CommissionTransaction.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/service/impl/payment/FinanceServiceImpl.java`
- Modify: `HealthLink_BE/src/main/resources/db/migration-v21-add-partner-wallet-ledger.sql`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/service/impl/payment/CommissionServiceImplTest.java`

**Interfaces:**
- Consumes ledger methods from Task 2.
- Produces `CommissionTransaction.refundedAt` for accurate new refund ordering and legacy backfill fallback.

- [ ] **Step 1: Mở rộng failing tests hiện có**

  Assert consultation/pharmacy commission creation gọi `recordPendingEarning`; appointment/order completion gọi `vestEarning`; refund gọi `recordPatientRefund(tx, previousStatus)` và set `refundedAt`. Thêm case refund sau legacy `SETTLED` làm balance âm và case refund `PENDING` không debit.

- [ ] **Step 2: Chạy test để xác nhận fail**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=CommissionServiceImplTest test`

  Expected: FAIL vì ledger interactions/refundedAt chưa có.

- [ ] **Step 3: Thay balance mutation trực tiếp bằng ledger commands**

  Sau khi save CTX mới, gọi `recordPendingEarning(tx)`. Trong `vestConsultationCommission` và `vestPharmacyCommission`, giữ update CTX status/vestedAt nhưng bỏ đoạn tự cộng `pendingSettlement`; gọi `vestEarning(tx)` để ledger service thực hiện atomically. Trong `processRefund` và `refundPharmacyOrderCommissions`, lưu `previousStatus`, set `REFUNDED/refundedAt`, rồi gọi `recordPatientRefund`; bỏ các block tự trừ Doctor/Pharmacy để tránh debit hai lần.

- [ ] **Step 4: Không nuốt lỗi local clawback**

  Trong `FinanceServiceImpl.processRefund`, bỏ `try/catch` chỉ log quanh `commissionService.processRefund`. Local Payment/Invoice/Commission/Ledger phải cùng rollback nếu clawback local thất bại; giữ PayPal exception handling hiện tại ngoài phạm vi refactor.

- [ ] **Step 5: Chạy tests và commit**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=CommissionServiceImplTest,FinanceServiceImplTest test`

  Expected: PASS.

  Commit: `feat(wallet): post earnings and patient refunds to ledger`

---

### Task 4: Refactor withdrawal thành reserve → submit PayPal → terminal update

**Files:**
- Create: `HealthLink_BE/src/main/java/com/HealthLink/service/payment/SettlementLifecycleService.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/service/impl/payment/SettlementLifecycleServiceImpl.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/integration/paypal/PayPalPayoutClient.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/integration/paypal/PayPalPayoutResult.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/entity/Settlement.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/service/impl/payment/SettlementServiceImpl.java`
- Modify: `HealthLink_BE/src/main/resources/db/migration-v21-add-partner-wallet-ledger.sql`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/service/impl/payment/SettlementLifecycleServiceImplTest.java`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/service/impl/payment/SettlementServiceImplTest.java`

**Interfaces:**
- `Settlement beginWithdrawal(String partnerType, String partnerId, String partnerName, BigDecimal amount, String paypalEmail, String notes)`.
- `void attachPayPalBatch(Integer settlementId, PayPalPayoutResult result)`.
- `void complete(Integer settlementId, String externalStatus)`.
- `void failAndReturn(Integer settlementId, String reason)`.
- `PayPalPayoutResult createPayout(Settlement settlement)` and `getPayoutBatch(String payoutBatchId)`.

- [ ] **Step 1: Viết lifecycle tests thất bại**

  Test begin withdrawal lock partner, validate minimum remaining balance, subtract amount immediately, create STL `PROCESSING` và ledger `WITHDRAWAL/PROCESSING/-amount`. Test concurrent/idempotent calls không thể reserve vượt balance. Test complete không đổi balance. Test `failAndReturn` hai lần chỉ tạo một `RETURN:STL:<id>` và cộng balance một lần.

- [ ] **Step 2: Viết orchestration tests thất bại**

  Mock PayPal result:

  - `SUCCESS` → same STL/entry `COMPLETED`.
  - `PENDING|PROCESSING|NEW` → giữ `PROCESSING` và lưu batch ID.
  - `DENIED|CANCELED` → `FAILED` + one RETURN.
  - timeout/5xx/unknown response → giữ `PROCESSING`, ghi notes, không RETURN.

- [ ] **Step 3: Chạy tests để xác nhận fail**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=SettlementLifecycleServiceImplTest,SettlementServiceImplTest test`

  Expected: FAIL vì lifecycle/client chưa tồn tại.

- [ ] **Step 4: Mở rộng Settlement và migration**

  Thêm `payoutBatchId` (unique nullable), `externalStatus`, `lastReconciledAt`. Migration thêm columns/index idempotently. Không lưu batch ID trong `notes` nữa; notes chỉ chứa message/error human-readable.

- [ ] **Step 5: Implement transaction boundaries**

  `beginWithdrawal`, `attachPayPalBatch`, `complete`, `failAndReturn` là các transaction riêng trong bean lifecycle. `SettlementServiceImpl` xác thực PIN, gọi `beginWithdrawal` để commit reserve, sau đó gọi `PayPalPayoutClient` ngoài transaction và dispatch kết quả về lifecycle. Xóa callback success đang trừ `pendingSettlement`, vì balance đã bị reserve.

  `failAndReturn` chỉ chạy cho failure terminal đã xác nhận. Với exception không xác định, set notes/externalStatus `UNKNOWN` nhưng giữ STL và withdrawal entry `PROCESSING`.

- [ ] **Step 6: Chạy tests và commit**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=SettlementLifecycleServiceImplTest,SettlementServiceImplTest test`

  Expected: PASS.

  Commit: `feat(wallet): reserve balance during PayPal withdrawal`

---

### Task 5: Đồng bộ trạng thái payout PayPal bằng scheduled reconciliation

**Files:**
- Create: `HealthLink_BE/src/main/java/com/HealthLink/scheduler/PayPalPayoutReconciliationScheduler.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/repository/payment/PaymentSettlementRepository.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/integration/paypal/PayPalPayoutClient.java`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/scheduler/PayPalPayoutReconciliationSchedulerTest.java`

**Interfaces:**
- Repository produces `List<Settlement> findTop100ByStatusAndPayoutBatchIdIsNotNullOrderByCreatedAtAsc("PROCESSING")`.
- Scheduler invokes `reconcile()` at `${wallet.paypal-reconciliation-ms:60000}`.

- [ ] **Step 1: Viết scheduler tests thất bại**

  Với ba STL processing, mock PayPal trả success, denied và pending. Assert lần lượt gọi lifecycle `complete`, `failAndReturn`, hoặc chỉ `attachPayPalBatch`; một item lỗi không ngăn các item sau. Assert unknown status không return balance.

- [ ] **Step 2: Chạy test để xác nhận fail**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PayPalPayoutReconciliationSchedulerTest test`

  Expected: FAIL vì scheduler chưa tồn tại.

- [ ] **Step 3: Implement reconciliation giới hạn batch**

  Job lấy tối đa 100 STL mỗi vòng, gọi PayPal `GET /v1/payments/payouts/{payoutBatchId}`, map terminal/non-terminal giống Task 4, set `lastReconciledAt` cho mọi response hợp lệ và log `settlementNumber`, batch ID, old/new status. Không retry create payout trong job này.

- [ ] **Step 4: Chạy tests và commit**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PayPalPayoutReconciliationSchedulerTest,SettlementLifecycleServiceImplTest test`

  Expected: PASS.

  Commit: `feat(wallet): reconcile PayPal payout statuses`

---

### Task 6: Cung cấp paged partner wallet API

**Files:**
- Create: `HealthLink_BE/src/main/java/com/HealthLink/dto/payment/PartnerWalletEntryResponse.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/dto/payment/PartnerWalletEntryFilter.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/service/payment/PartnerWalletQueryService.java`
- Create: `HealthLink_BE/src/main/java/com/HealthLink/service/impl/payment/PartnerWalletQueryServiceImpl.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/controller/payment/PartnerPaymentController.java`
- Modify: `HealthLink_BE/src/main/java/com/HealthLink/dto/payment/PartnerBalanceResponse.java`
- Test: `HealthLink_BE/src/test/java/com/HealthLink/controller/payment/PartnerPaymentControllerTest.java`

**Interfaces:**
- Adds `GET /api/payment/partner/{partnerId}/wallet-entries`.
- Query params: `search`, `type=ALL|EARNING|WITHDRAWAL|ADJUSTMENT`, `status`, `from`, `to`, `page=0`, `size=10`.
- Returns Spring page JSON with `content`, `number`, `size`, `totalElements`, `totalPages`.

- [ ] **Step 1: Viết controller/query tests thất bại**

  Verify access validator is called, page size is capped at 100, `ADJUSTMENT` maps to `RETURN|REFUND`, dates are inclusive, search matches appointment/order ID and settlement number, and another partner's entries never leak.

- [ ] **Step 2: Chạy test để xác nhận fail**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PartnerPaymentControllerTest test`

  Expected: FAIL với route/service chưa tồn tại.

- [ ] **Step 3: Implement DTO/query/route**

  Response fields: `entryId`, `entryType`, `status`, signed `amount`, `description`, `appointmentId`, `pharmacyOrderId`, `settlementId`, `settlementNumber`, `paypalEmail`, `effectiveAt`, `updatedAt`. Join settlement in mapper bằng bulk lookup cho page IDs; không gây N+1.

  Status filter chỉ nhận enum hợp lệ; invalid value trả HTTP 400. Default sort `effectiveAt,DESC` rồi `entryId,DESC`.

- [ ] **Step 4: Chuẩn hóa balance response**

  Thêm `availableBalance` bằng đúng `pendingBalance`; giữ field cũ. `eligibleForWithdrawal=false` khi balance âm hoặc không đáp ứng quy tắc giữ lại `$10.00` hiện tại.

- [ ] **Step 5: Chạy tests và commit**

  Run: `mvn -f HealthLink_BE/pom.xml -Dtest=PartnerPaymentControllerTest,PartnerWalletLedgerServiceImplTest test`

  Expected: PASS.

  Commit: `feat(wallet): expose unified partner wallet history`

---

### Task 7: Chuyển Doctor và Pharmacy web sang ledger feed thống nhất

**Files:**
- Create: `HealthLink_FE/src/components/wallet/wallet-entry-view-model.js`
- Create: `HealthLink_FE/src/hooks/wallet/usePartnerWallet.js`
- Modify: `HealthLink_FE/src/api/paymentApi.js`
- Modify: `HealthLink_FE/src/components/doctor/DoctorWalletTab.jsx`
- Modify: `HealthLink_FE/src/components/pharmacy/PharmacyWalletTab.jsx`
- Modify: `HealthLink_FE/src/pages/pharmacy/PharmacyDashboardPage.jsx`
- Test: `HealthLink_FE/test/wallet-entry-view-model.test.js`

**Interfaces:**
- `paymentApi.getPartnerWalletEntries(partnerId, filters)` returns Spring page data.
- `usePartnerWallet({ partnerId, partnerType, pageSize })` owns balance, entries, filters, page, loading and `refresh()`.
- `getWalletEntryPresentation(entry)` returns `{ direction, icon, badgeTone, statusLabel, amountTone, strikeAmount, kind }`.

- [ ] **Step 1: Viết pure view-model tests thất bại**

  Dùng `node:test` assert mapping chính xác:

  ```js
  assert.deepEqual(getWalletEntryPresentation({ entryType: 'EARNING', status: 'PENDING', amount: 50 }), {
    direction: 'positive', icon: 'schedule', badgeTone: 'warning',
    statusLabel: 'Pending', amountTone: 'warning', strikeAmount: false, kind: 'earning'
  });
  ```

  Thêm cases VESTED/check/success, WITHDRAWAL PROCESSING/red/minus, COMPLETED label `Withdrawn` neutral badge, FAILED strike, RETURNED plus, REFUNDED minus.

- [ ] **Step 2: Chạy test để xác nhận fail**

  Run from `HealthLink_FE`: `node --test test/wallet-entry-view-model.test.js`

  Expected: FAIL vì helper chưa tồn tại.

- [ ] **Step 3: Implement API và hook**

  API gửi page zero-based và bỏ params rỗng. Hook debounce search 300ms, reset page khi filter đổi, fetch balance + wallet entries song song, expose server `totalElements/totalPages`, và sau withdrawal gọi `refresh()` thay vì append một object mới. Giữ entry identity theo `entryId`, do đó status refresh thay chính item hiện tại.

- [ ] **Step 4: Chuyển hai wallet tabs sang hook**

  Xóa logic `transactions + settlements` và local pagination. Doctor/Pharmacy truyền cùng normalized entries vào shared list. Trong Pharmacy dashboard, bỏ hai requests `getPartnerTransactions/getPartnerSettlements` cùng states/props tương ứng; không thay các requests orders/requests/work-items.

- [ ] **Step 5: Chạy test/build và commit**

  Run from `HealthLink_FE`:

  - `node --test test/wallet-entry-view-model.test.js`
  - `npm run build`

  Expected: test PASS, Vite build succeeds.

  Commit: `refactor(wallet): use unified ledger feed on partner web`

---

### Task 8: Cập nhật shared list, filter và visual states

**Files:**
- Modify: `HealthLink_FE/src/components/wallet/WalletTransactionList.jsx`
- Modify: `HealthLink_FE/src/components/wallet/WalletTransactionFilters.jsx`
- Modify: `HealthLink_FE/src/components/wallet/WalletHelpers.js`
- Modify: `HealthLink_FE/src/components/wallet/wallet-shared.css`
- Test: `HealthLink_FE/test/wallet-entry-view-model.test.js`

**Interfaces:**
- Consumes normalized ledger entries and `getWalletEntryPresentation` from Task 7.
- Filter values are `all|EARNING|WITHDRAWAL|ADJUSTMENT` and raw visible statuses.

- [ ] **Step 1: Mở rộng failing tests cho filter/status labels**

  Assert `COMPLETED` withdrawal formats `Withdrawn`, `RETURNED` không bị gọi `Refunded`, và `REFUNDED` mô tả patient refund. Assert positive/negative direction dựa trên signed amount, không dựa riêng vào status.

- [ ] **Step 2: Implement UI mapping**

  - Pending earning: warning accent/icon `schedule`, dấu `+`.
  - Vested earning: success accent/icon `check_circle`, dấu `+`.
  - Withdrawal mọi trạng thái: red icon/accent/amount, dấu `-`.
  - Completed withdrawal: badge neutral `Withdrawn`.
  - Failed withdrawal: amount opacity thấp + line-through, badge error.
  - Returned: plus, icon `undo`, label `Returned`.
  - Refunded: minus, icon `currency_exchange`, label `Refunded` và description patient refund.

  Expanded detail hiển thị reference phù hợp, PayPal email cho withdrawal, và `updatedAt` là thời điểm status cuối; không render CTX `SETTLED` vì API mới không trả loại đó.

- [ ] **Step 3: Cập nhật filters**

  Type options: All, Earnings, Withdrawals, Adjustments. Status options: Pending, Vested, Processing, Withdrawn, Failed, Returned, Refunded. Không còn group `completed` chứa `SETTLED` và không còn group `pending` gộp earning pending với payout processing.

- [ ] **Step 4: Verify responsive/accessibility**

  Badge có text, không dựa chỉ vào màu; icon decorative dùng `aria-hidden`; amount line-through của failed vẫn đọc được; mobile width không overflow ở settlement number dài.

- [ ] **Step 5: Chạy checks và commit**

  Run from `HealthLink_FE`:

  - `node --test test/wallet-entry-view-model.test.js`
  - `npm run lint`
  - `npm run build`

  Expected: wallet test PASS; lint không có lỗi mới trong files thay đổi; build succeeds.

  Commit: `feat(wallet): clarify earning withdrawal and adjustment states`

---

### Task 9: Contract, migration rehearsal và end-to-end verification

**Files:**
- Modify: `docs/openapi/healthlink-openapi.json` (chỉ sections partner balance/wallet entries/settlement)
- Create: `HealthLink_BE/src/test/java/com/HealthLink/service/impl/payment/PartnerWalletFlowIntegrationTest.java`
- Modify: `docs/superpowers/specs/2026-07-16-partner-wallet-ledger-design.md` chỉ khi implementation phát hiện contract cần làm rõ, không thay đổi yêu cầu đã duyệt.

**Interfaces:**
- Freezes public wallet entry and balance contracts introduced in Task 6.

- [ ] **Step 1: Viết integration scenarios**

  Bao phủ full flows:

  1. Payment creates PENDING; completion vests and balance becomes `+50`.
  2. Withdraw `40` reserves balance, one STL/withdrawal entry moves PROCESSING→COMPLETED, balance stays `10` after completion.
  3. Withdraw failure moves PROCESSING→FAILED, creates one `+RETURNED`, balance restored; repeated reconciliation is no-op.
  4. Patient refund after vest creates `-REFUNDED`, can make balance negative; next vest offsets negative arithmetically.
  5. Two withdrawal requests cannot both pass against the same balance.
  6. Partner A cannot query Partner B entries.

- [ ] **Step 2: Rehearse migration twice**

  Trên database test snapshot, chạy `migration-v21-add-partner-wallet-ledger.sql` hai lần. Expected: lần hai không tạo duplicate hoặc lỗi object-exists. So sánh counts theo idempotency key và kiểm tra không có ledger earning cho CTX SETTLED.

- [ ] **Step 3: Update OpenAPI surgically**

  Thêm schemas/query params/response page cho `/wallet-entries`, `availableBalance`, và Settlement `PROCESSING` semantics. Không load hoặc rewrite toàn bộ JSON bằng formatter; patch section nhỏ để tránh diff lớn.

- [ ] **Step 4: Chạy full verification**

  Run:

  - `mvn -f HealthLink_BE/pom.xml test`
  - From `HealthLink_FE`: `node --test test/*.test.js`
  - From `HealthLink_FE`: `npm run build`
  - From repo root: `codegraph sync .`
  - `git diff --check`

  Expected: backend tests PASS, Node tests PASS, build succeeds, CodeGraph sync succeeds, no whitespace errors.

- [ ] **Step 5: Manual acceptance check**

  Với Doctor và Pharmacy web, xác nhận filters, dấu +/- và colors đúng; withdrawal chỉ có một row được cập nhật; failed withdrawal có row RETURNED; negative balance disables Withdraw; refresh không duplicate entry.

- [ ] **Step 6: Commit**

  Commit: `test(wallet): verify partner wallet ledger lifecycle`

## Rollout Notes

1. Deploy schema/migration trước hoặc cùng backend; migration idempotent và endpoint cũ vẫn hoạt động.
2. Deploy backend và theo dõi số STL `PROCESSING` quá lâu, duplicate idempotency errors và balance-change audit logs.
3. Chỉ deploy frontend sau khi `/wallet-entries` và `availableBalance` có trên backend.
4. Không xóa CTX/STL endpoints hoặc cột `pendingSettlement` trong rollout này.
5. Nếu reconciliation không liên hệ được PayPal, giữ reserve và `PROCESSING`; không tự tạo `RETURNED`. Admin xử lý payout không xác định ngoài scope của UI này.
