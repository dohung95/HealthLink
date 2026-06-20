# Doctor Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a doctor profile page with integrated reviews, restructure navigation to move Reviews/Wallet out of sidebar into avatar dropdown.

**Architecture:** The doctor module uses React 19 + Bootstrap 5 + custom CSS (`--doctor-*` vars). The profile page is a 2-column layout (profile info left, reviews right) fetched from existing APIs. Navigation changes affect `navigationConfig.js`, `DoctorDashboardPage.jsx`, `DoctorLayout.jsx`, `DoctorHeader.jsx`, and `App.jsx`.

**Tech Stack:** React 19, Bootstrap 5.3.8, react-router-dom v7, Material Symbols icons, custom CSS variables

---

### Task 1: Remove Reviews and Wallet from navigationConfig.js

**Files:**
- Modify: `src/layouts/navigationConfig.js:1-9`

- [ ] **Remove Reviews and Wallet from NAV_ITEMS**

Replace the NAV_ITEMS array to remove `reviews` and `wallet` entries:

```javascript
export const NAV_ITEMS = [
  { key: 'appointments', label: 'Appointments', icon: 'calendar_today', wide: true },
  { key: 'patients',     label: 'Patients',     icon: 'groups',          wide: true },
  { key: 'prescriptions',label: 'Prescriptions', icon: 'medication',     wide: true },
  { key: 'schedule',     label: 'Schedule',      icon: 'event_note',     wide: true },
  { key: 'chat',         label: 'Chat',          icon: 'chat',           wide: true },
];
```

- [ ] **Commit**

```bash
git add HealthLink_FE/src/layouts/navigationConfig.js
git commit -m "refactor: remove reviews and wallet from doctor sidebar nav"
```

---

### Task 2: Update DoctorDashboardPage — nav detection + profile route

**Files:**
- Modify: `src/pages/doctor/DoctorDashboardPage.jsx:97-309`

- [ ] **Update currentNavItem to remove reviews and wallet references**

Replace the `currentNavItem` useMemo (lines 113-123) to match new NAV_ITEMS indices:

```javascript
const currentNavItem = useMemo(() => {
  const path = location.pathname;
  if (path === '/doctor' || path.startsWith('/doctor/appointments')) return NAV_ITEMS[0];
  if (path.startsWith('/doctor/patients')) return NAV_ITEMS[1];
  if (path.startsWith('/doctor/prescriptions')) return NAV_ITEMS[2];
  if (path.startsWith('/doctor/schedule')) return NAV_ITEMS[3];
  if (path.startsWith('/doctor/chat')) return NAV_ITEMS[4];
  return NAV_ITEMS[0];
}, [location.pathname]);
```

- [ ] **Add `onNavigateToProfile` and `onNavigateToWallet` callbacks**

Add these functions inside the DoctorDashboardPage component (before `const contextValue`):

```javascript
const handleNavigateToProfile = useCallback(() => {
  navigate('/doctor/profile');
}, [navigate]);

const handleNavigateToWallet = useCallback(() => {
  navigate('/doctor/wallet');
}, [navigate]);
```

- [ ] **Pass new callbacks to DoctorLayout**

Add `onNavigateToProfile` and `onNavigateToWallet` to the DoctorLayout props (around line 279-297):

```javascript
<DoctorLayout
  ...
  onChangePassword={handleChangePassword}
  onNavigateToProfile={handleNavigateToProfile}
  onNavigateToWallet={handleNavigateToWallet}
>
```

- [ ] **Add profile route inside the `<Outlet>` section**

Add the profile route before the closing `</Route>` (after line 256):

```javascript
<Route path="profile" element={<DoctorProfilePage />} />
```

- [ ] **Import DoctorProfilePage**

Add at the top with other doctor imports (around line 16):

```javascript
import DoctorProfilePage from '@pages/doctor/DoctorProfilePage';
```

- [ ] **Commit**

```bash
git add HealthLink_FE/src/pages/doctor/DoctorDashboardPage.jsx
git commit -m "feat: add profile route and navigation callbacks to DoctorDashboardPage"
```

---

### Task 3: Update DoctorLayout — pass new callbacks to DoctorHeader

**Files:**
- Modify: `src/layouts/DoctorLayout.jsx:5-210`

- [ ] **Add new props to DoctorLayout destructuring**

Add `onNavigateToProfile` and `onNavigateToWallet` to the props (line 5-24):

```javascript
const DoctorLayout = memo(({
  ...
  onChangePassword,
  onNavigateToProfile,
  onNavigateToWallet,
}) => {
```

- [ ] **Pass them to DoctorHeader**

Add the two new props to the `<DoctorHeader>` call (around line 139-154):

```javascript
<DoctorHeader
  ...
  onChangePassword={onChangePassword}
  onNavigateToProfile={onNavigateToProfile}
  onNavigateToWallet={onNavigateToWallet}
/>
```

- [ ] **Remove reviews from nav-link rendering** (no changes needed — NAV_ITEMS already removed them in Task 1)

- [ ] **Commit**

```bash
git add HealthLink_FE/src/layouts/DoctorLayout.jsx
git commit -m "feat: pass profile and wallet navigation callbacks through DoctorLayout"
```

---

### Task 4: Update DoctorHeader — add profile and wallet to avatar dropdown

**Files:**
- Modify: `src/components/doctor/DoctorHeader.jsx:1-280`

- [ ] **Add new props to destructuring**

Add `onNavigateToProfile` and `onNavigateToWallet` to the destructured props (line 13-28):

```javascript
const DoctorHeader = memo(({
  ...
  onChangePassword,
  onNavigateToProfile,
  onNavigateToWallet,
}) => {
```

- [ ] **Add My Profile button to the dropdown menu**

Insert after the profile card section and before the Change Password button (after line 237, before line 241):

```jsx
{/* My Profile */}
<button
  className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
  onClick={() => { setShowProfileDropdown(false); onNavigateToProfile(); }}
  type="button"
  style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', transition: 'background 0.1s ease' }}
  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
>
  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>person</span>
  My Profile
</button>
```

- [ ] **Add Wallet button to the dropdown menu**

Insert after the Change Password button and before the Logout section, wrapping in a border-top divider:

```jsx
<div style={{ borderTop: '1px solid var(--border)' }}>
  <button
    className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
    onClick={() => { setShowProfileDropdown(false); onNavigateToWallet(); }}
    type="button"
    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', transition: 'background 0.1s ease' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>account_balance_wallet</span>
    Wallet
  </button>
</div>
```

The final dropdown menu item order should be:
1. (Profile header card) — unchanged
2. My Profile
3. Change Password
4. — divider —
5. Wallet
6. — divider —
7. Logout

- [ ] **Commit**

```bash
git add HealthLink_FE/src/components/doctor/DoctorHeader.jsx
git commit -m "feat: add My Profile and Wallet to avatar dropdown"
```

---

### Task 5: Create DoctorProfilePage

**Files:**
- Create: `src/pages/doctor/DoctorProfilePage.jsx`

- [ ] **Create the full DoctorProfilePage component**

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doctorReviewApi } from '@api/reviewApi';
import { toast } from 'sonner';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import DoctorSkeleton from '@components/doctor/DoctorSkeleton';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const getInitials = (name) => {
  if (!name) return 'DR';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
};

export default function DoctorProfilePage() {
  const { doctorData } = useOutletContext();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({
    totalPages: 1, totalElements: 0, hasNext: false, hasPrevious: false,
  });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        doctorReviewApi.getAll(page, 10),
        doctorReviewApi.getStats(),
      ]);
      setReviews(reviewsData.reviews || []);
      setPagination({
        totalPages: reviewsData.totalPages || 1,
        totalElements: reviewsData.totalElements || 0,
        hasNext: reviewsData.hasNext || false,
        hasPrevious: reviewsData.hasPrevious || false,
      });
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load reviews', err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleReplyClick = (review) => {
    setSelectedReview(review);
    setReplyText(review.doctorReply || '');
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || replyText.trim().length < 5) {
      toast.error('Reply must be at least 5 characters');
      return;
    }
    setSubmitting(true);
    try {
      await doctorReviewApi.reply(selectedReview.reviewId, { reply: replyText.trim() });
      toast.success('Reply submitted successfully');
      setShowReplyModal(false);
      setSelectedReview(null);
      setReplyText('');
      loadReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingBarWidth = (rating) => {
    if (!stats || stats.totalReviews === 0) return 0;
    const count = stats.ratingDistribution?.[rating] || 0;
    return (count / stats.totalReviews) * 100;
  };

  const renderStars = (rating, size = 'normal') => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i key={i} className={`bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} ${size === 'small' ? '' : ''}`} />
      );
    }
    return stars;
  };

  const avatarUrl = doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl;
  const doctorName = doctorData?.fullName || 'Doctor';
  const specialty = doctorData?.specialty || doctorData?.specialtyName || '';
  const yearsOfExperience = doctorData?.yearsOfExperience || '';
  const languages = doctorData?.languageSpoken || '';
  const phone = doctorData?.phoneNumber || '';
  const location = doctorData?.location || '';
  const bio = doctorData?.bio || doctorData?.description || '';

  return (
    <div className="doctor-profile-page" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <div className="row g-4">
        {/* Left Column — Profile Info */}
        <div className="col-12 col-md-4">
          <div className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'var(--surface-card, #fff)' }}>
            {/* Avatar + Name */}
            <div className="text-center p-4 pb-3" style={{ background: 'linear-gradient(180deg, var(--doctor-primary, #0052cc) 0%, var(--doctor-primary, #0052cc) 80px, transparent 80px)' }}>
              <div
                className="mx-auto overflow-hidden rounded-circle border border-3 d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '6rem', height: '6rem', borderColor: 'rgba(255,255,255,0.6)', background: 'var(--primary-light, #e8f0fe)', color: 'var(--doctor-primary, #0052cc)', fontSize: '1.5rem' }}
              >
                {avatarUrl ? (
                  <img alt={doctorName} className="w-100 h-100 object-fit-cover" src={avatarUrl} />
                ) : (
                  <span>{getInitials(doctorName)}</span>
                )}
              </div>
              <h5 className="fw-bold mt-3 mb-0" style={{ color: '#fff' }}>{doctorName}</h5>
              {specialty && <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.85)' }}>{specialty}</p>}
            </div>

            {/* Rating Summary */}
            {stats && (
              <div className="d-flex align-items-center justify-content-center gap-2 px-4 py-3 border-bottom" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
                <span className="fw-bold fs-4" style={{ color: 'var(--doctor-primary, #0052cc)' }}>
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </span>
                <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.875rem' }}>
                  {renderStars(Math.round(stats.averageRating || 0))}
                </div>
                <span className="small text-secondary">
                  {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Personal Details */}
            <div className="p-4 d-flex flex-column gap-3">
              {yearsOfExperience && (
                <div className="d-flex align-items-center gap-3">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)' }}>badge</span>
                  <div>
                    <p className="mb-0 small text-secondary">Experience</p>
                    <p className="mb-0 fw-medium">{yearsOfExperience} years</p>
                  </div>
                </div>
              )}
              {languages && (
                <div className="d-flex align-items-center gap-3">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)' }}>language</span>
                  <div>
                    <p className="mb-0 small text-secondary">Languages</p>
                    <p className="mb-0 fw-medium">{languages}</p>
                  </div>
                </div>
              )}
              {phone && (
                <div className="d-flex align-items-center gap-3">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)' }}>call</span>
                  <div>
                    <p className="mb-0 small text-secondary">Phone</p>
                    <p className="mb-0 fw-medium">{phone}</p>
                  </div>
                </div>
              )}
              {location && (
                <div className="d-flex align-items-center gap-3">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)' }}>location_on</span>
                  <div>
                    <p className="mb-0 small text-secondary">Location</p>
                    <p className="mb-0 fw-medium">{location}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <div className="px-4 pb-4">
                <p className="mb-0 small text-secondary">About</p>
                <p className="mb-0 mt-1" style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Reviews */}
        <div className="col-12 col-md-8">
          {loading && !stats ? (
            <DoctorSkeleton />
          ) : (
            <>
              {/* Stats Cards */}
              {stats && (
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-4">
                    <div className="border-0 shadow-sm rounded-4 p-4 text-center h-100 d-flex flex-column align-items-center justify-content-center" style={{ background: 'var(--surface-card, #fff)' }}>
                      <span className="fw-bold display-5" style={{ color: 'var(--doctor-primary, #0052cc)' }}>
                        {stats.averageRating?.toFixed(1) || '0.0'}
                      </span>
                      <div className="d-flex align-items-center gap-1 mb-1">
                        {renderStars(Math.round(stats.averageRating || 0))}
                      </div>
                      <span className="small text-secondary">{stats.totalReviews} total</span>
                    </div>
                  </div>
                  <div className="col-12 col-sm-4">
                    <div className="border-0 shadow-sm rounded-4 p-4 h-100 d-flex flex-column justify-content-center" style={{ background: 'var(--surface-card, #fff)' }}>
                      <p className="mb-2 small fw-semibold text-secondary">Rating Distribution</p>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '0.8125rem' }}>
                          <span className="text-nowrap">{rating} <i className="bi bi-star-fill text-warning" style={{ fontSize: '0.625rem' }}></i></span>
                          <div className="flex-grow-1" style={{ height: '6px', background: 'var(--surface-muted, #f3f4f6)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${getRatingBarWidth(rating)}%`, height: '100%', background: 'var(--doctor-primary, #0052cc)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                          </div>
                          <span className="text-secondary" style={{ minWidth: '1.5rem', textAlign: 'right' }}>{stats.ratingDistribution?.[rating] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12 col-sm-4">
                    <div className="border-0 shadow-sm rounded-4 p-4 h-100 d-flex flex-column justify-content-center" style={{ background: 'var(--surface-card, #fff)' }}>
                      <p className="mb-2 small fw-semibold text-secondary">Response Status</p>
                      <div className="d-flex gap-4">
                        <div className="text-center">
                          <span className="fw-bold fs-4" style={{ color: 'var(--doctor-primary, #0052cc)' }}>{stats.totalReplied || 0}</span>
                          <p className="mb-0 small text-secondary">Replied</p>
                        </div>
                        <div className="text-center">
                          <span className="fw-bold fs-4 text-warning">{stats.totalPendingReply || 0}</span>
                          <p className="mb-0 small text-secondary">Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review List */}
              <div className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'var(--surface-card, #fff)' }}>
                <div className="px-4 py-3 border-bottom d-flex align-items-center gap-2" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)' }}>reviews</span>
                  <h6 className="mb-0 fw-semibold">Patient Reviews</h6>
                </div>

                {reviews.length === 0 ? (
                  <DoctorEmptyState title="No reviews yet" icon="reviews" />
                ) : (
                  <div className="px-4 py-3">
                    {reviews.map((review) => (
                      <div key={review.reviewId} className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div className="d-flex align-items-center justify-content-center rounded-circle fw-semibold text-secondary" style={{ width: '2rem', height: '2rem', fontSize: '0.75rem', background: 'var(--surface-muted, #f3f4f6)' }}>
                              {(review.patientName || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="mb-0 fw-semibold" style={{ fontSize: '0.875rem' }}>
                                {review.anonymous ? 'Anonymous Patient' : review.patientName}
                              </p>
                              <p className="mb-0 small text-secondary">{formatDate(review.reviewDate)}</p>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <p className="mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{review.comment}</p>

                        {/* Doctor Reply */}
                        {review.doctorReply && (
                          <div className="mt-3 p-3 rounded-3" style={{ background: 'var(--surface-muted, #f9fafb)', borderLeft: '3px solid var(--doctor-primary, #0052cc)' }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--doctor-primary, #0052cc)' }}>reply</span>
                              <span className="small fw-semibold">Your Reply</span>
                              {review.doctorReplyDate && (
                                <span className="small text-secondary ms-auto">{formatDate(review.doctorReplyDate)}</span>
                              )}
                            </div>
                            <p className="mb-0 small">{review.doctorReply}</p>
                          </div>
                        )}

                        {/* Admin Reply */}
                        {review.adminReply && (
                          <div className="mt-2 p-3 rounded-3" style={{ background: 'var(--surface-muted, #f9fafb)', borderLeft: '3px solid var(--bs-warning, #ffc107)' }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--bs-warning, #ffc107)' }}>verified</span>
                              <span className="small fw-semibold">HealthLink Response</span>
                              {review.adminReplyDate && (
                                <span className="small text-secondary ms-auto">{formatDate(review.adminReplyDate)}</span>
                              )}
                            </div>
                            <p className="mb-0 small">{review.adminReply}</p>
                          </div>
                        )}

                        {/* Reply / Edit Reply Button */}
                        <div className="mt-2">
                          <button
                            className="btn btn-sm px-3 py-1 fw-semibold"
                            style={{ fontSize: '0.8125rem', border: '1px solid var(--border, #e5e7eb)', background: 'var(--surface-card, #fff)', color: 'var(--text-primary)' }}
                            onClick={() => handleReplyClick(review)}
                          >
                            <span className="material-symbols-outlined me-1" style={{ fontSize: '0.875rem', verticalAlign: 'middle' }}>reply</span>
                            {review.doctorReply ? 'Edit Reply' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="d-flex align-items-center justify-content-center gap-3 px-4 py-3 border-top" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
                    <button
                      className="btn btn-sm px-3"
                      style={{ border: '1px solid var(--border, #e5e7eb)', color: 'var(--text-primary)' }}
                      disabled={!pagination.hasPrevious}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <i className="bi bi-chevron-left me-1"></i>Previous
                    </button>
                    <span className="small text-secondary">
                      Page {page + 1} of {pagination.totalPages}
                    </span>
                    <button
                      className="btn btn-sm px-3"
                      style={{ border: '1px solid var(--border, #e5e7eb)', color: 'var(--text-primary)' }}
                      disabled={!pagination.hasNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next<i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <div className="position-fixed inset-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1060 }}
          onClick={() => setShowReplyModal(false)}>
          <div className="bg-white rounded-4 shadow-lg p-4" style={{ maxWidth: '520px', width: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="mb-0 fw-semibold">
                <span className="material-symbols-outlined me-2" style={{ fontSize: '1.25rem', color: 'var(--doctor-primary, #0052cc)', verticalAlign: 'middle' }}>reply</span>
                Reply to Review
              </h6>
              <button className="btn-close" onClick={() => setShowReplyModal(false)} />
            </div>
            <div className="mb-3 p-3 rounded-3" style={{ background: 'var(--surface-muted, #f9fafb)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                  {selectedReview.anonymous ? 'Anonymous Patient' : selectedReview.patientName}
                </span>
                <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                  {renderStars(selectedReview.rating, 'small')}
                </div>
              </div>
              <p className="mb-0 small">{selectedReview.comment}</p>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Your Reply</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Write your reply here... (minimum 5 characters)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={1000}
              />
              <div className="d-flex justify-content-between mt-1">
                <small className="text-secondary">Minimum 5 characters</small>
                <small className="text-secondary">{replyText.length}/1000</small>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-sm px-3"
                style={{ border: '1px solid var(--border, #e5e7eb)' }}
                onClick={() => setShowReplyModal(false)}
                disabled={submitting}
              >Cancel</button>
              <button
                className="btn btn-sm px-3 text-white"
                style={{ background: 'var(--doctor-primary, #0052cc)' }}
                onClick={handleSubmitReply}
                disabled={submitting || replyText.trim().length < 5}
              >
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Submitting...</>
                ) : (
                  'Submit Reply'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add HealthLink_FE/src/pages/doctor/DoctorProfilePage.jsx
git commit -m "feat: create DoctorProfilePage with 2-column layout and integrated reviews"
```

---

### Task 6: Update App.jsx — remove reviews route, keep wallet route

**Files:**
- Modify: `src/App.jsx:1-416`

- [ ] **Remove DoctorReviewsView import and route**

Delete line 71:
```javascript
import DoctorReviewsView from './pages/doctor/reviews/DoctorReviewsView';
```

Delete line 253:
```javascript
<Route path="reviews" element={<DoctorReviewsView />} />
```

The wallet route at line 256 stays:
```javascript
<Route path="wallet" element={<DoctorWalletPage />} />
```

- [ ] **Commit**

```bash
git add HealthLink_FE/src/App.jsx
git commit -m "refactor: remove DoctorReviewsView route from App.jsx"
```

---

### Task 7: Verify — lint/typecheck

- [ ] **Run the frontend dev build to verify no errors**

```bash
cd HealthLink_FE
npm run build 2>&1
```

If there are errors, fix them inline.

- [ ] **Run graphify update**

```bash
cd E:\FAI\Projects\HealthLink
graphify update .
```
