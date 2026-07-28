# HealthLink AI Clinical Decision Support — Team Setup Guide

Tài liệu này hướng dẫn cài đặt chức năng **AI Clinical Decision Support (AI CDS)**
trên máy Windows mới sau khi pull source code HealthLink.

AI CDS trong dự án chỉ dùng cho **student demo với dữ liệu synthetic**. Không dùng
dữ liệu bệnh nhân thật và không dùng output để chẩn đoán hoặc điều trị thật.

## 1. Kết quả cần đạt

Sau khi hoàn tất, máy local phải chạy được pipeline:

```text
Doctor upload ảnh/PDF xét nghiệm
→ OCR
→ Doctor verification
→ Structured lab observations
→ Clinical context + deterministic rules
→ RAG guideline
→ Qwen3 chạy bằng Ollama
→ Doctor review/approval
→ Explicit apply + audit
```

Các service local:

| Thành phần | Địa chỉ | Cách chạy |
|---|---|---|
| Frontend React/Vite | `http://localhost:63527` | Local process |
| Spring Boot backend | `http://127.0.0.1:8096` | Local process |
| Python AI service | `http://127.0.0.1:8097` | Local process |
| Ollama | `http://127.0.0.1:11434` | Windows service/process |
| MinIO API | `http://127.0.0.1:9000` | Docker Compose |
| MinIO Console | `http://127.0.0.1:9001` | Docker Compose |
| Qdrant HTTP | `http://127.0.0.1:6333` | Docker Compose |

> `docker compose up -d` chỉ khởi động MinIO và Qdrant. Backend, frontend,
> Ollama và AI service vẫn phải được chạy riêng.

## 2. Tài nguyên phải nhận từ người phụ trách

Source code Git không chứa secret, model binary, guideline PDF hoặc database
volume. Trước khi bắt đầu, teammate cần:

1. Quyền pull branch chứa toàn bộ commit AI CDS T01–T12.
2. Một SQL Server local và database `Project04` đã có schema/dữ liệu seed của
   HealthLink.
3. Resource guideline gồm nguyên cấu trúc:

   ```text
   guidelines/
   ├── manifests/
   │   ├── kdigo-ckd-guideline-2024.manifest.json
   │   ├── who-haemoglobin-cutoffs-2024.manifest.json
   │   ├── who-hearts-cvd-management-2018.manifest.json
   │   ├── who-hearts-d-type-2-diabetes-2020.manifest.json
   │   └── who-hepatitis-b-guideline-2024.manifest.json
   └── source-pdf/
       ├── KDIGO-2024-CKD-Guideline.pdf
       ├── who-haemoglobin-cutoffs-2024.pdf
       ├── who-hearts-cvd-management-2018.pdf
       ├── who-hearts-d-type-2-diabetes-2020.pdf
       └── who-hepatitis-b-guideline-2024.pdf
   ```

4. Một hoặc nhiều ảnh/PDF xét nghiệm synthetic để kiểm thử OCR.

Không gửi file `.env` thật qua Git, email công khai hoặc ảnh chụp màn hình.
Mỗi teammate nên tự tạo secret local. Guideline và fixture được chuyển qua thư
mục chia sẻ riêng của nhóm.

## 3. Phần mềm bắt buộc

| Phần mềm | Phiên bản khuyến nghị | Kiểm tra |
|---|---|---|
| Git | Bản ổn định hiện tại | `git --version` |
| Java JDK | 21 | `java --version` |
| Maven | Wrapper hoặc Maven tương thích project | `mvn --version` |
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Python | 3.11.x 64-bit | `py -3.11 --version` |
| Docker Desktop | Bản có Compose v2 | `docker compose version` |
| Ollama | Bản hỗ trợ model đã pin | `ollama --version` |
| SQL Server + SSMS | SQL Server local | Kết nối được `localhost:1433` |

Nếu một lệnh không được nhận diện, đóng và mở lại PowerShell sau khi cài phần
mềm.

## 4. Pull source code

Mở PowerShell:

```powershell
cd <THU_MUC_CHA>
git clone <REPOSITORY_URL> HealthLink
cd HealthLink
git checkout <TEN_BRANCH_AI_CDS>
git pull
git log --oneline -5
```

Xác nhận có các thư mục:

```powershell
Test-Path .\HealthLink_BE
Test-Path .\HealthLink_FE
Test-Path .\HealthLink_AI_Service
Test-Path .\compose.yml
```

Expected output: cả bốn dòng đều là `True`.

## 5. Tạo một file `.env` duy nhất

Tạo file `HealthLink\.env` ở repository root. Không tạo thêm `.env` trong từng
module. File này đã được ignore và không được commit.

Mẫu cấu hình:

```dotenv
# ---------- SQL Server ----------
SPRING_DATASOURCE_URL=jdbc:sqlserver://localhost:1433;databaseName=Project04;trustServerCertificate=true;responseCharset=UTF-8
SPRING_DATASOURCE_USERNAME=sa
SPRING_DATASOURCE_PASSWORD=replace-with-local-sql-password

# ---------- Application security ----------
JWT_SECRET=replace-with-random-base64-secret
AI_SERVICE_KEY=replace-with-random-local-worker-key

# ---------- Docker Compose ----------
COMPOSE_PROJECT_NAME=healthlink
MINIO_ROOT_USER=healthlink-local-admin
MINIO_ROOT_PASSWORD=replace-with-random-minio-password
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_CLINICAL_BUCKET=healthlink-clinical-private
MINIO_GUIDELINES_BUCKET=healthlink-guidelines-private
MINIO_DATA_VOLUME=healthlink-ai-local-minio-data

QDRANT_API_KEY=replace-with-random-qdrant-api-key
QDRANT_HTTP_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_DATA_VOLUME=healthlink-ai-local-qdrant-data

# ---------- Backend → AI/MinIO ----------
AI_SERVICE_URL=http://127.0.0.1:8097
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_BUCKET_LABS=healthlink-clinical-private

# ---------- AI service ----------
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b-instruct-2507-q4_K_M
OLLAMA_TEMPERATURE=0.1
OLLAMA_NUM_PREDICT=768
OLLAMA_TIMEOUT_SECONDS=180

QDRANT_URL=http://127.0.0.1:6333
HL_GUIDELINE_COLLECTION=healthlink-guidelines-student-demo-v2026-1
HL_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
HL_EMBEDDING_CACHE_DIR=replace-with-absolute-embedding-cache-path
HL_BACKEND_BASE_URL=http://127.0.0.1:8096

# ---------- Student-demo safety gates ----------
AI_CDS_ENABLED=true
AI_OPENROUTER_FALLBACK_ENABLED=false
AI_CDS_PATIENT_VISIBILITY=false
```

Lưu ý:

- `MINIO_CLINICAL_BUCKET` và `MINIO_BUCKET_LABS` phải cùng giá trị.
- Backend và AI service phải dùng cùng `AI_SERVICE_KEY`.
- Compose và AI service phải dùng cùng `QDRANT_API_KEY`.
- `HL_EMBEDDING_CACHE_DIR` phải là đường dẫn tuyệt đối, ví dụ
  `D:\HealthLink.local-resources\models\huggingface`.
- OpenRouter không cần cho luồng local. Cloud fallback hiện bị khóa; không thêm
  OpenRouter key vào source code.

### Tạo secret local bằng PowerShell

Chạy đoạn sau riêng cho từng secret. Không copy các dòng mô tả/output rồi chạy
lại như PowerShell command.

```powershell
$secretBytes = New-Object byte[] 64
$secretRng = [Security.Cryptography.RandomNumberGenerator]::Create()
$secretRng.GetBytes($secretBytes)
[Convert]::ToBase64String($secretBytes)
$secretRng.Dispose()
```

Dùng output khác nhau cho `JWT_SECRET`, `AI_SERVICE_KEY`,
`MINIO_ROOT_PASSWORD` và `QDRANT_API_KEY`. Không hiển thị chúng khi gửi log cho
người khác.

## 6. Chuẩn bị SQL Server và migration

Các migration không được Docker tự chạy. Mở SSMS, chọn đúng database
`Project04`, rồi chạy lần lượt:

1. `migration-v24-ai-cds-core.sql`
2. `migration-v25-ai-lab-reports.sql`
3. `migration-v29-ai-lab-upload-idempotency.sql`
4. `migration-v30-ai-lab-observation-revisions.sql`
5. `migration-v31-ai-clinical-context.sql`
6. `migration-v32-ai-clinical-rules.sql`
7. `migration-v33-ai-guidelines.sql`
8. `migration-v34-fix-guideline-chunk-index.sql`
9. `migration-v35-ai-cds-suggestions.sql`
10. `migration-v36-ai-clinical-safety-context.sql`
11. `migration-v37-ai-cds-decision-audit.sql`

Các file nằm tại:

```text
HealthLink_BE/src/main/resources/db/
```

Không có migration AI CDS `v26`–`v28` trong branch hiện tại; không tự tạo file
thay thế. Sequence thực tế tiếp tục từ `v25` sang `v29`.

Sau khi chạy, kiểm tra:

```sql
USE Project04;

SELECT name
FROM sys.tables
WHERE name IN (
    'AiJobs',
    'LabReports',
    'LabObservations',
    'LabReportUploadIdempotencies',
    'LabObservationRevisions',
    'EncounterClinicalContexts',
    'ClinicalContextSnapshots',
    'ClinicalRuleEvaluations',
    'GuidelineDocuments',
    'GuidelineChunks',
    'CdsSuggestionRuns',
    'CdsDecisions',
    'CdsAuditEvents'
)
ORDER BY name;
```

Expected: các bảng trên xuất hiện. Nếu migration lỗi kiểu foreign key/data type,
không sửa database bằng cách đoán; xác nhận đang dùng file mới nhất trên branch
và chạy lại migration theo đúng thứ tự.

## 7. Khởi động MinIO và Qdrant

Từ repository root:

```powershell
docker compose up -d
docker compose ps
```

Expected:

- `healthlink-minio-1` là `healthy`.
- `healthlink-qdrant-1` là `running` hoặc `healthy`.
- `minio-init` có thể chạy xong rồi dừng; đây là hành vi bình thường.

Kiểm tra:

```powershell
curl.exe -fsS http://127.0.0.1:9000/minio/health/live
curl.exe -fsS http://127.0.0.1:6333/healthz
```

Không dùng `docker compose down -v` trừ khi chủ động muốn xóa toàn bộ MinIO và
Qdrant data local.

## 8. Cài Ollama và model CDS

```powershell
ollama pull qwen3:4b-instruct-2507-q4_K_M
ollama list
```

Expected: danh sách có `qwen3:4b-instruct-2507-q4_K_M`.

CDS generation đã pin model này trong code. Không đổi sang MedGemma:
qualification student-demo trước đó loại MedGemma vì fabricated citations.

Kiểm tra Ollama:

```powershell
curl.exe -fsS http://127.0.0.1:11434/api/tags
```

Nếu Ollama chưa tự chạy, mở Ollama trước khi khởi động AI service.

## 9. Cài Python AI service

```powershell
cd .\HealthLink_AI_Service
py -3.11 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Expected: không có `ERROR` và lệnh sau trả về Python 3.11:

```powershell
& .\.venv\Scripts\python.exe --version
```

Nếu virtual environment trỏ tới một Python đã bị gỡ, xóa riêng thư mục
`HealthLink_AI_Service\.venv`, cài lại Python 3.11 và tạo lại venv. Không copy
venv từ máy khác.

## 10. Tải embedding model vào cache local

RAG chạy offline và `local_files_only=True`, vì vậy model phải được tải trước:

```powershell
$env:HL_EMBEDDING_CACHE_DIR = "<ABSOLUTE_EMBEDDING_CACHE_PATH>"
& .\.venv\Scripts\python.exe -c "from sentence_transformers import SentenceTransformer; model=SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', cache_folder=r'$env:HL_EMBEDDING_CACHE_DIR'); print(model.get_embedding_dimension())"
```

Expected output cuối: `384`.

Giá trị `<ABSOLUTE_EMBEDDING_CACHE_PATH>` phải giống
`HL_EMBEDDING_CACHE_DIR` trong root `.env`.

## 11. Chuẩn bị guideline resource

Đặt resource ngoài Git, ví dụ:

```text
D:\HealthLink.local-resources\ai-cds\guidelines\
```

Kiểm tra đủ 5 PDF và 5 manifest:

```powershell
$guidelineRoot = "D:\HealthLink.local-resources\ai-cds\guidelines"
(Get-ChildItem "$guidelineRoot\source-pdf" -Filter *.pdf).Count
(Get-ChildItem "$guidelineRoot\manifests" -Filter *.manifest.json).Count
```

Expected: `5` và `5`.

Không đổi tên PDF riêng lẻ vì `pdfFile` trong manifest phải trỏ đúng file. Mỗi
manifest phải có:

- `status = APPROVED_STUDENT_DEMO`;
- `documentId`, `title`, `issuer`, `version`, `publishedDate`;
- `license`;
- `pdfFile`;
- `sha256` đúng với PDF.

Kiểm tra checksum từng PDF:

```powershell
Get-FileHash "$guidelineRoot\source-pdf\*.pdf" -Algorithm SHA256
```

Nếu checksum khác manifest, không ingest file đó; nhận lại resource bundle đúng
phiên bản.

## 12. Khởi động backend trước khi ingest guideline

Mở PowerShell mới:

```powershell
cd <HEALTHLINK_REPOSITORY>\HealthLink_BE
mvn clean test
mvn spring-boot:run
```

Expected:

- Test kết thúc với `BUILD SUCCESS`.
- Backend log có `Started HealthLinkApplication`.
- Port `8096` đang lắng nghe:

  ```powershell
  Test-NetConnection 127.0.0.1 -Port 8096
  ```

  `TcpTestSucceeded` phải là `True`.

Nếu AI CDS trả `503 AI CDS is disabled`, kiểm tra root `.env` chỉ có một dòng
`AI_CDS_ENABLED=true`, sau đó restart backend.

## 13. Ingest guideline vào Qdrant

Thực hiện bước này một lần trên mỗi Qdrant volume mới. Backend cần đang chạy để
ghi audit hash cho guideline chunks.

Từ `HealthLink_AI_Service`:

```powershell
$guidelineRoot = "D:\HealthLink.local-resources\ai-cds\guidelines"
$manifestFiles = Get-ChildItem "$guidelineRoot\manifests" -Filter *.manifest.json

foreach ($manifestFile in $manifestFiles) {
  & .\.venv\Scripts\python.exe -c "import json,sys; from pathlib import Path; from scripts.ingest_guidelines import ingest; print(json.dumps(ingest(Path(sys.argv[1]), 'http://127.0.0.1:6333', 'healthlink-guidelines-student-demo-v2026-1')))" $manifestFile.FullName
  if ($LASTEXITCODE -ne 0) {
    throw "Guideline ingestion failed: $($manifestFile.Name)"
  }
}
```

Expected:

- Mỗi manifest in ra danh sách `chunkId`.
- Không có `checksum mismatch`.
- Không có `guideline resource manifest is not approved`.
- Không có `401 Unauthorized` từ Qdrant/backend.

Kiểm tra collection:

```powershell
$qdrantHeaders = @{ "api-key" = "<QDRANT_API_KEY_FROM_ENV>" }
Invoke-RestMethod `
  -Uri "http://127.0.0.1:6333/collections/healthlink-guidelines-student-demo-v2026-1" `
  -Headers $qdrantHeaders
```

Expected:

- `status` là `ok`;
- vector size là `384`;
- `points_count` lớn hơn `0`.

Không chụp hoặc gửi output có chứa API key.

## 14. Khởi động AI service

Mở PowerShell mới:

```powershell
cd <HEALTHLINK_REPOSITORY>\HealthLink_AI_Service
& .\.venv\Scripts\python.exe main.py
```

Lần khởi động đầu có thể chậm vì EasyOCR/NudeNet load model. Chờ đến khi thấy:

```text
AI Service ready at http://127.0.0.1:8097
Uvicorn running on http://127.0.0.1:8097
```

Từ PowerShell khác:

```powershell
curl.exe -fsS http://127.0.0.1:8097/health
```

Expected:

- `status` là `healthy`;
- `easyocr.available` là `true`;
- `ollama.available` là `true`;
- `cds.provider` là `LOCAL_OLLAMA`;
- `cds.model` là `qwen3:4b-instruct-2507-q4_K_M`.

`tesseract.available=false` không chặn AI CDS hiện tại vì OCR chính dùng
EasyOCR.

## 15. Cài và chạy frontend

Mở PowerShell mới:

```powershell
cd <HEALTHLINK_REPOSITORY>\HealthLink_FE
npm install
npm run test:unit
npm run dev
```

Expected:

- Test không có failure.
- Vite hiển thị `http://localhost:63527`.

Luôn mở bằng `http://localhost:63527`, không dùng `http://[::1]:63527`.

## 16. Smoke test toàn bộ pipeline

Dùng tài khoản doctor synthetic từ data seed:

1. Đăng nhập frontend.
2. Mở một appointment được phân công cho doctor đó.
3. Mở tab **Clinical Results**.
4. Upload ảnh/PDF xét nghiệm synthetic.
5. Chờ report chuyển từ `UPLOADED` sang `NEEDS_VERIFICATION`.
6. Kiểm tra OCR chỉ tạo các dòng xét nghiệm; sửa unit/value sai nếu có.
7. Chọn `VERIFIED` hoặc `REJECTED` cho mọi dòng rồi bấm
   **Confirm verification**.
8. Nhập/kiểm tra symptoms, vitals, allergies, conditions, medications,
   pregnancy/fasting status và working diagnosis trong clinical context.
9. Tạo AI CDS suggestion.
10. Kiểm tra output có citation và hiển thị rõ đây không phải medical record.
11. Doctor chọn:
    - Approve as-is;
    - Approve with edits; hoặc
    - Reject.
12. Chỉ sau approval, chọn section và bấm **Apply selected sections**.
13. Xác nhận medical document mới ở trạng thái Doctor-owned draft và audit event
    đã được tạo.

Expected:

- Không có suggestion trước khi lab observations được doctor xác nhận.
- LLM không tự động apply output.
- Doctor không truy cập được appointment không được phân công.
- Mọi doctor đều có thể dùng CDS cho appointment được phân công; không có
  doctor allowlist riêng.

## 17. Test trước khi bàn giao

Backend:

```powershell
cd <HEALTHLINK_REPOSITORY>\HealthLink_BE
mvn clean test
```

AI service:

```powershell
cd <HEALTHLINK_REPOSITORY>\HealthLink_AI_Service
& .\.venv\Scripts\python.exe -m pytest -q
```

Frontend:

```powershell
cd <HEALTHLINK_REPOSITORY>\HealthLink_FE
npm run test:unit
```

Không commit các file sau:

- `.env`;
- `.venv/` hoặc `venv/`;
- `__pycache__/`, `*.pyc`;
- `.playwright-cli/`, `test-results/`, `output/`;
- model binary/cache;
- MinIO/Qdrant volume;
- guideline PDF nếu chưa được nhóm phê duyệt cho Git.

## 18. Troubleshooting

### `docker compose` báo thiếu biến

Nguyên nhân: root `.env` không tồn tại, sai tên hoặc đang chạy Compose ngoài
repository root.

```powershell
cd <HEALTHLINK_REPOSITORY>
docker compose up -d
```

### AI health không kết nối được Ollama

```powershell
ollama list
curl.exe -fsS http://127.0.0.1:11434/api/tags
```

Đảm bảo Qwen3 đã được pull và Ollama đang chạy.

### `ModuleNotFoundError`

Đang dùng Python hệ thống thay vì venv:

```powershell
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe main.py
```

### Embedding báo không tìm thấy model local

Chạy lại bước tải embedding, kiểm tra `HL_EMBEDDING_CACHE_DIR` là đường dẫn
tuyệt đối và restart AI service.

### Qdrant trả `401 Unauthorized`

`QDRANT_API_KEY` trong root `.env` phải giống key Compose đã dùng khi container
được tạo. Sau khi đổi key:

```powershell
docker compose up -d --force-recreate qdrant
```

Không dùng `-v`, vì tùy chọn đó xóa volume.

### RAG trả rỗng hoặc `RAG_RETRIEVAL_FAILED`

Kiểm tra:

1. Qdrant đang chạy.
2. `HL_GUIDELINE_COLLECTION` đúng tên collection đã ingest.
3. Collection có `points_count > 0`.
4. Embedding model có dimension `384`.
5. Manifest dùng corpus version `student-demo-2026.1`.

### CDS generation trả `422`

Thường là request/context/citation không đúng schema. Kiểm tra backend và AI
service cùng ở commit mới nhất, lab report đã `VERIFIED`, clinical context đã
lưu và guideline đã ingest.

### CDS generation trả `503` hoặc Ollama timeout

Kiểm tra GPU/RAM, đóng ứng dụng nặng, xác nhận Qwen3 đang chạy và tăng
`OLLAMA_TIMEOUT_SECONDS` trong root `.env` nếu máy chậm. Restart AI service sau
khi đổi cấu hình.

### Frontend báo CORS hoặc login sai dù tài khoản đúng

Mở bằng `http://localhost:63527`. Backend hiện hỗ trợ local origins `63527` và
`63528`, nhưng `[::1]` là origin khác.

### Report đứng ở `UPLOADED`

Kiểm tra đồng thời:

- backend vẫn đang chạy;
- AI service `8097` healthy;
- `AI_SERVICE_KEY` giống nhau;
- MinIO healthy;
- backend job runner không có lỗi retry/final failure.

## 19. Thứ tự khởi động hằng ngày

Sau khi setup một lần, mỗi ngày chỉ cần:

1. Mở Docker Desktop.
2. Chạy `docker compose up -d` ở repository root.
3. Mở Ollama.
4. Chạy backend.
5. Chạy AI service.
6. Chạy frontend.
7. Kiểm tra AI `/health`.

Không cần chạy lại migration, cài dependencies, tải model hoặc ingest guideline
nếu database/venv/model cache/Docker volumes vẫn còn.

## 20. Khi cần reset máy demo

Ưu tiên reset database bằng data seed và chạy lại migration. Chỉ reset Qdrant
khi cần ingest lại corpus. Xóa volume MinIO sẽ xóa các lab report đã upload.

Trước khi reset, xác định rõ dữ liệu local nào có thể mất. Với student demo,
không có dữ liệu bệnh nhân thật, nhưng việc reset vẫn làm mất evidence và dữ
liệu demo đang có.
