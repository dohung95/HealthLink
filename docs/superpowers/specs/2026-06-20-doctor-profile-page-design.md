# Doctor Profile Page & Navigation Redesign

## Overview

Redesign the doctor client navigation and introduce a profile page. Remove the standalone Reviews page, move Wallet to the avatar dropdown, and integrate review management into the new profile page.

## Goals

- Create a read-only profile page at `/doctor/profile` displaying doctor info + integrated reviews
- Add "My Profile" entry to the avatar dropdown in DoctorHeader
- Move "Wallet" from sidebar to avatar dropdown
- Remove "Reviews" sidebar entry and standalone `/doctor/reviews` route
- Modern, clean UI using Bootstrap 5 + existing custom CSS theme

## Navigation Changes

### Sidebar (NAV_ITEMS) — new order:
1. Appointments
2. Patients
3. Prescriptions
4. Schedule
5. Chat

Removed: Reviews, Wallet.

### Avatar dropdown — new items:
1. **My Profile** → navigates to `/doctor/profile`
2. **Wallet** → navigates to `/doctor/wallet`
3. **Change Password** → opens modal (existing)
4. **Logout** (existing)

### Routes

| Action | Route | Component |
|--------|-------|-----------|
| New | `/doctor/profile` | `DoctorProfilePage` |
| Removed | `/doctor/reviews` | `DoctorReviewsView` |
| Unchanged | `/doctor/wallet` | `DoctorWalletPage` |

The profile route is NOT shown in the sidebar — it is accessed only from the avatar dropdown.

## Profile Page Layout (2-column)

```
Desktop (>768px):               Mobile (<768px):
┌──────────┬────────────┐      ┌──────────────────┐
│ Profile  │  Reviews    │      │ Profile Info     │
│ (col-4)  │  (col-8)   │      ├──────────────────┤
│          │            │      │ Reviews          │
│ ──────   │  ────────  │      └──────────────────┘
│ Avatar   │  Stats     │
│ Name     │  Rating    │
│ Specialty│  Bar chart │
│ Rating   │  List      │
│ Info     │  Paginate  │
│ Bio      │            │
└──────────┴────────────┘
```

### Left column — Profile Info
- Avatar (circular, existing styling)
- Doctor name
- Specialty
- Star rating + review count
- Personal details: years of experience, languages, phone, location
- Bio section

### Right column — Reviews
- **Rating stats card**: average rating, star distribution bars, response counts
- **Review list**: paginated, each card shows patient name, date, stars, comment, doctor reply
- **Reply handling**: View existing reply, or "Reply" button to open modal

All review functionality mirrors the existing `DoctorReviewsView.jsx` (reply modal, pagination, stats).

## Components

### New files
- `src/pages/doctor/DoctorProfilePage.jsx` — main 2-column page, fetches profile + reviews data

### Modified files
- `src/components/doctor/DoctorHeader.jsx` — add "My Profile" and "Wallet" to avatar dropdown. Add `onNavigateToProfile` and `onNavigateToWallet` callbacks as new props (passed from DoctorDashboardPage through DoctorLayout)
- `src/layouts/navigationConfig.js` — remove Reviews and Wallet from NAV_ITEMS
- `src/layouts/DoctorLayout.jsx` — update active nav detection to not crash on /profile and /wallet
- `src/pages/doctor/DoctorDashboardPage.jsx` — update currentNavItem map, add profile route
- `src/App.jsx` — remove `/doctor/reviews` route, remove import for `DoctorReviewsView`

### Deleted (by omission)
- The standalone `/doctor/reviews` route and `DoctorReviewsView` page remain in codebase but are no longer routed

## Design Guidelines (Bootstrap 5)

- Use existing doctor CSS variables (`--doctor-primary`, `--doctor-bg`, etc.)
- Cards: `border-0 shadow-sm rounded-4` for profile card
- Info items: `d-flex align-items-center gap-2` with `material-symbols-outlined` icons
- Review stats: compact cards in a row using `row-cols-1 row-cols-md-3`
- Review list: `border-bottom` separation, no card wrappers per item (anti-card overuse)
- Stars: Bootstrap icons `bi-star-fill text-warning`
- Empty state: use `DoctorEmptyState` component
- Loading state: use `DoctorSkeleton` component
- Error state: use `DoctorErrorState` component
- Responsive: `col-md-4` + `col-md-8` → stacked on mobile
- Reply modal: use existing modal pattern from `DoctorReviewsView`
- Viewport: `min-h-[100dvh]` not `h-screen`
- Max width: `max-width: 1400px`

## Data Flow

1. `DoctorProfilePage` calls `doctorReviewApi.getStats()` + `doctorReviewApi.getAll(page, size)` on mount
2. Doctor data comes from `useOutletContext().doctorData` (already loaded by `DoctorDashboardPage`)
3. Page state: reviews[], stats, loading, error, page, pagination, replyModal
4. Reply submission calls `doctorReviewApi.reply(reviewId, { reply })`, then refreshes list

## Edge Cases

- **No reviews**: Show `DoctorEmptyState` with message "No reviews yet"
- **Loading**: `DoctorSkeleton` while fetching
- **API error**: `DoctorErrorState` with retry button
- **Pagination edge**: First page has no "Previous", last page has no "Next"
- **Reply validation**: Minimum 5 characters
- **Mobile**: Two columns collapse to single column, full-width stack

## Out of Scope

- Editing profile info (read-only as requested)
- Avatar upload on profile page (stays in existing Change Password area if needed)
- Any changes to doctor's public profile page (`/doctors/:id`)
