# Doctor Patients Pages — UI Redesign

**Date:** 2026-06-20
**Status:** Approved
**Framework:** React 19 + Vite 7 + Bootstrap 5 + Tailwind v4
**Font:** Geist
**Icons:** Material Symbols Outlined

---

## 1. Approach

**Split-View (Approach 2):** Single page with a left list panel (35%) and right detail panel (65%). Clicking a patient in the left panel renders their detail in the right panel without a full page navigation.

---

## 2. Routing

| Route | Behavior |
|-------|----------|
| `/doctor/patients` | Split-view, no patient selected → empty state in detail panel |
| `/doctor/patients/:patientId` | Split-view, patient loaded in detail panel, row highlighted in list |

- URL updates when a patient is selected (for deep linking / refresh).
- Backward compatible: old URL `/doctor/patients/:patientId` still works.

---

## 3. Left Panel — Patient List (35% width)

### Search
- Icon + input field, placeholder: "Search name, email, phone..."
- Debounced 250ms triggers re-fetch

### Filters
- 3 chips: **All** | **Upcoming** | **Recent**
- Active chip has `--doctor-primary` background

### Patient Row
```
┌────────────────────────────────────┐
│ [Av] Nguyễn Văn A          ● Active│
│      📞 090 123 4567              │
├────────────────────────────────────┤
```

| Element | Spec |
|---------|------|
| Avatar | 36px, rounded-lg, gradient background, first-letter fallback |
| Name | `font-weight: 600`, `font-size: 0.875rem`, truncate |
| Phone | `font-size: 0.75rem`, `color: var(--text-muted)`, phone icon + formatted number |
| Status dot | `●` — Blue=Upcoming, Amber=Recent, Gray=Inactive |
| Active row | Left accent border (3px blue), `background: var(--primary-subtle)` |

### Pagination
- Simple: "Page X of Y" + Prev / Next buttons at bottom of list
- Only visible when `totalPages > 1`

### States
- **Loading:** 5 skeleton rows (shimmer)
- **Empty:** Icon + "No patients found" + contextual message
- **Error:** Error state with retry button

---

## 4. Right Panel — Patient Detail (65% width)

### Empty State (no patient selected)
- Large icon (`group` or `person_search`)
- "Select a patient to view details"
- Subtle centered layout

### Hero Section
```
┌─────────────────────────────────────────────────┐
│ ← Back to patients                               │
│                                                  │
│ ┌──────┐  [Full Name]        [Call] [Message]    │
│ │Avatar│  [email]             [Schedule Appt]    │
│ │      │  [phone]                                │
│ └──────┘                                         │
└─────────────────────────────────────────────────┘
```
- Avatar: 56px, rounded-xl, gradient
- Quick action buttons: subtle outline style, with icons
- "Back to patients" only visible on mobile (when collapsed)

### Quick Stats Row
- 5-6 compact stat pills: Age, Gender, Blood Type, Visits, Prescriptions
- Displayed inline with dividers

### Tab Navigation
| Tab | Content |
|-----|---------|
| **Overview** | Personal info grid (phone, gender, blood type, DOB, address) + vitals |
| **Medical** | History, allergies, chronic conditions, current medications |
| **Appointments** | Timeline list: date/time, type, status, diagnosis, "Open" button |
| **Prescriptions** | List: issue date, diagnosis, status, medication count |
| **Documents** | List: category name + document count |

### Tab: Overview
- 2-column grid of `Field` components: Phone, Gender, Blood Type, DOB, Address

### Tab: Medical
- 4 cards in a 2x2 grid: History, Allergies, Chronic Conditions, Current Medications
- Each card: label + value

### Tab: Appointments
- Vertical list with date, type, status badge, diagnosis line
- "Open" button to navigate to appointment detail
- Empty state: "No appointments found"

### Tab: Prescriptions
- Vertical list with date, diagnosis, status, medication count
- "Appointment" button linking to related appointment
- Empty state: "No prescriptions found"

### Tab: Documents
- Vertical list with category name + document count
- Empty state: "No documents found"

---

## 5. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| `< 900px` | Collapse to single column. List view full width. Click patient → detail slides in. Back button returns to list. |
| `≥ 900px` | Split-view side by side |

---

## 6. States Matrix

| State | List Panel | Detail Panel |
|-------|-----------|-------------|
| Loading | 5 skeleton rows | Panel hidden / skeleton |
| Empty | Empty state with icon + message | N/A |
| Error | Error state with retry | Previous content or empty |
| Selected | Highlighted row | Detail loaded with tabs |

---

## 7. Technical Notes

- **No new 3rd party libraries** needed. Uses existing: Bootstrap, Tailwind, CSS custom properties, Material Symbols.
- **DoctorPatientView.jsx** — new main split-view component replacing `DoctorPatientsView.jsx`.
- **DoctorPatientDetailView.jsx** — refactored to accept `patient` + `history` as props (data fetched by parent).
- **PatientCard.jsx** — can be repurposed or replaced by the row component.
- **CSS** — add a new `doctor-split-patients.css` file for split-specific styles. Reuse existing tokens.

### File Changes Summary

| File | Action |
|------|--------|
| `src/pages/doctor/DoctorDashboardPage.jsx` | Update route to use new split view component |
| `src/pages/doctor/patient/DoctorPatientsView.jsx` | Rewrite as split-view container |
| `src/pages/doctor/patient/DoctorPatientDetailView.jsx` | Refactor to receive props (no own data fetching) |
| `src/components/doctor/PatientCard.jsx` | Replace with compact row component or keep for backward compat |
| `src/components/Css/doctor/doctor-dashboard/doctor-patients.css` | Update/replace styles |
| `src/components/Css/doctor/doctor-dashboard/doctor-dashboard.css` | Update import if needed |
