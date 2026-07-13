# HealthLink

Nen tang cham soc suc khoe da kenh gom web (React), mobile (Flutter), backend (Spring Boot) va dich vu AI kiem duyet anh.

## Modules

| Module | Tech | Role | Port |
|--------|------|------|------|
| HealthLink_BE | Spring Boot 3.2.5 / Java 21 | REST API, WebSocket/STOMP, JWT auth, JPA | 8096 |
| HealthLink_FE | React 19 + Vite 7 | Web dashboard cho patient, doctor, pharmacy, admin | 63527 |
| HealthLink_MB | Flutter 3.11+ / Dart | Mobile app cho patient | - |
| HealthLink_AI_Moderation | FastAPI / Python | Kiem duyet anh upload (NudeNet) | 8097 |

## Main Features

### Guest
- Register patient account, login, confirm email, reset password
- View public doctor directory
- Register as doctor or pharmacy

### Patient
- Manage profile, security, avatar
- Search doctors & specialties
- Book / hold / release slot, pay via PayPal
- View / cancel / reschedule appointments
- Join video / audio / chat consultation
- Manage health records & documents, share / revoke access
- Submit pre-consultation vital signs
- View prescriptions & reminders
- Request pharmacy consultation, confirm / pay / track pharmacy order
- Review doctor, receive notifications

### Doctor
- Manage profile, weekly schedule & exceptions
- View daily appointments, start / complete consultation
- View shared patient records, record notes / diagnosis
- Create prescription & follow-up
- View wallet / settlements, manage reviews
- Receive notifications

### Pharmacy
- Manage profile & inventory / import inventory
- Receive consultation requests, accept / reject / respond
- Create / revise order quote, update order status
- View wallet / settlements, receive notifications

### Admin
- View dashboard / analytics
- Manage patients, doctors, pharmacies
- Approve / reject registrations
- Manage appointments, reviews, notifications
- Monitor schedule compliance, view audit logs
- Configure commission, view financial reports, process settlements

## Architecture

- **Backend**: Spring Boot 3.2.5, Java 21, Spring Security JWT, WebSocket/STOMP, JPA/Hibernate, SQL Server, 46+ controllers, 47 entities, 48+ repositories
- **Frontend**: React 19 + Vite 7, React Router 7, Axios, Bootstrap 5, Firebase client, STOMP/SockJS, PayPal JS SDK, Gemini AI, NSFWJS, ZegoCloud video
- **Mobile**: Flutter 3.11+, Provider state management, SharedPreferences, STOMP WebSocket, file/image picker
- **AI Moderation**: FastAPI service, NudeNet classifier cho anh upload, endpoint `POST /moderate-image`
- **Database**: SQL Server (`Project04`) via JPA, Hibernate ddl-auto update
- **External**: PayPal Sandbox, Gmail SMTP, Firebase/FCM push, Gemini/Vertex AI, ZegoCloud video

## Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| DFD Context | [dfd-context.mmd](doc/diagrams/dfd-context.mmd) | System boundary, external entities, data stores, data flows |
| DFD Level 1 | [dfd-level-1.mmd](doc/diagrams/dfd-level-1.mmd) | Major processes, data stores, data flows between them |
| Use Case | [usecase-healthlink.mmd](doc/diagrams/usecase-healthlink.mmd) | Actors and use cases grouped by role |

Render Mermaid files with: GitHub Markdown, VS Code extension (Mermaid Preview), hoac `npx @mermaid-js/mermaid-cli`.

## Local Setup

### Backend
- Java 21, SQL Server local (instance `localhost:1433`, database `Project04`)
```bash
cd HealthLink_BE
mvn spring-boot:run
```

### Frontend
```bash
cd HealthLink_FE
npm install
npm run dev
```

### Mobile
```bash
cd HealthLink_MB
flutter pub get
flutter run
```

### AI Moderation
```bash
cd HealthLink_AI_Moderation
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8097
```

## Configuration

Key placeholders (khong chua secret that):

| Property | Description |
|----------|-------------|
| `spring.datasource.url` | SQL Server JDBC URL |
| `spring.datasource.username` | DB user |
| `spring.datasource.password` | DB password |
| `jwt.secret` | AES-256 base64 key cho JWT |
| `paypal.client-id` / `paypal.client-secret` | PayPal REST API credentials (Sandbox) |
| `spring.mail.username` / `spring.mail.password` | Gmail SMTP app password |
| `app.firebase.config-file` | Firebase admin SDK path |
| `app.gemini.api-key` | Gemini/Vertex AI API key |
| `GEOAPIFY_API_KEY` | Geoapify key for Vietnam address verification (set as an environment variable) |
| `app.moderation.url` | AI moderation service URL |

Xem `application.properties` va `application-dev.properties` trong `HealthLink_BE/` cho danh sach day du.

## API Areas

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, refresh token, logout |
| `/api/registration` | Patient/doctor/pharmacy registration, admin approval |
| `/api/account/patient` | Patient profile CRUD |
| `/api/account/doctors` | Doctor profile & schedule management |
| `/api/account/pharmacy` | Pharmacy profile & inventory |
| `/api/appointments` | Booking, slots, hold/release, history |
| `/api/consultations` | Start, complete, notes, follow-up |
| `/api/health-records` | Patient records, documents, sharing |
| `/api/prescriptions` | Prescription header/items, medicine library |
| `/api/pharmacy-*` | Consultation requests, orders, quotes |
| `/api/payment` | PayPal create/capture, invoices, refunds, commissions |
| `/api/notifications` | Device tokens, notification history |
| `/api/chat` | Chat rooms, messages, WebSocket STOMP |
| `/api/admin/*` | Dashboard, entity management, compliance, audit, reports |

## Testing

```bash
# Backend
cd HealthLink_BE && mvn -q test

# Frontend
cd HealthLink_FE && npm run lint

# Mobile
cd HealthLink_MB && flutter test
```

## Notes

- README duoc cap nhat theo code hien tai, khong phai tai lieu yeu cau ban dau
- Mot so local config / port co the can dieu chinh theo may dev
- Secret nen duoc chuyen sang bien moi truong thay vi `application.properties`
