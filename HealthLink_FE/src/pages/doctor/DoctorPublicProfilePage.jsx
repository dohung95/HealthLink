import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import '@components/Css/DoctorDirectory.css';
import { useAuth } from '@context/AuthContext';
import ConfirmModal from '@components/ConfirmModal';
import Loading from '@components/Loading';

const DoctorPublicProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const REVIEW_PAGE_SIZE = 5;
    const [reviewPage, setReviewPage] = useState(1);

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
                setLoading(true);
                const data = await doctorService.getDoctorById(id);
                setDoctor(data);
            } catch (error) {
                console.error("Error download profile:", error);
            } finally {
                // Delay để hiển thị loading animation
                setTimeout(() => {
                    setLoading(false);
                }, 800);
            }
        };

        if (id) fetchDoctor();
    }, [id]);

    // Hiển thị Loading component
    if (loading) return <Loading />;

    if (!doctor) return (
        <div className="container mt-5 text-center">
            <div className="alert alert-danger">Doctor not found.</div>
        </div>
    );

    const doctorId = doctor.doctorId || doctor.doctorID || id;
    const doctorName = doctor.fullName || doctor.name || 'Doctor';
    const doctorInitial = doctorName.charAt(0).toUpperCase();

    const reviews = Array.isArray(doctor.reviews) ? doctor.reviews : [];

    const averageRating = Number(doctor.averageRating || 0);
    const totalReviews = Number(doctor.totalReviews || reviews.length || 0);
    const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEW_PAGE_SIZE));

    const pagedReviews = reviews.slice(
        (reviewPage - 1) * REVIEW_PAGE_SIZE,
        reviewPage * REVIEW_PAGE_SIZE
    );

    // helper function to render stars
    const renderStars = (rating) => {
        const r = Math.round(rating || 0);
        return <span className="text-warning fs-4">{"★".repeat(r)}{"☆".repeat(5 - r)}</span>;
    };

    const getPaginationItems = (current, total) => {
        const delta = 2;
        const range = [];
        const result = [];
        let last;

        for (let i = 1; i <= total; i++) {
            if (
                i === 1 ||
                i === total ||
                (i >= current - delta && i <= current + delta)
            ) {
                range.push(i);
            }
        }

        for (const page of range) {
            if (last) {
                if (page - last === 2) {
                    result.push(last + 1);
                } else if (page - last > 2) {
                    result.push('...');
                }
            }

            result.push(page);
            last = page;
        }

        return result;
    };

    // Xử lý khi click Schedule Appointment
    const handleScheduleAppointment = () => {
        const target = `/patient-dashboard/book/${doctorId}`;

        if (!isAuthenticated) {
            setShowModal(true);
        } else {
            navigate(target);
        }
    };

    // Xử lý khi xác nhận trong modal
    const handleConfirmLogin = () => {
        const target = `/patient-dashboard/book/${doctorId}`;

        setShowModal(false);

        sessionStorage.setItem('postLoginRedirect', target);

        navigate('/login', {
            state: {
                redirectTo: target,
            },
        });
    };

    // Xử lý khi hủy modal
    const handleCloseModal = () => {
        setShowModal(false);
    };

    return (
        <div className='Background_Doctors'>
            <div className="container mt-4">
                <button className="btn btn-outline-secondary mb-3" onClick={() => navigate(-1)}>
                    &larr; Back
                </button>

                {/* --- HEADER PROFILE --- */}
                <div className="card shadow mb-4 border-0">
                    <div className="card-body p-4">
                        <div className="row align-items-center">
                            <div className="col-md-3 text-center border-end">
                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                                    style={{ width: '120px', height: '120px', fontSize: '40px' }}>
                                    {doctorInitial}
                                </div>
                                <h3 className="mb-1">{doctorName}</h3>
                            </div>
                            <div className="col-md-9 ps-md-5">
                                <h5 className="text-uppercase text-muted mb-3">Doctor Details</h5>
                                <div className="row mb-4">
                                    <div className="col-md-6 mb-2">
                                        <i className="bi bi-mortarboard-fill text-primary me-2"></i>
                                        <strong>Specialty:</strong> {doctor.specialty}
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <i className="bi bi-briefcase-fill text-primary me-2"></i>
                                        <strong>Experience:</strong> {doctor.yearsOfExperience} years
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <i className="bi bi-translate text-primary me-2"></i>
                                        <strong>Languages:</strong> {doctor.languageSpoken}
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                                        <strong>Location:</strong> {doctor.location}
                                    </div>
                                </div>

                                {/* Rating Box */}
                                <div className="d-flex align-items-center bg-light p-3 rounded shadow-sm">
                                    <div className="me-4 text-center">
                                        <h1 className="mb-0 text-warning fw-bold">{averageRating.toFixed(1)}</h1>
                                        <small className="text-muted">Rating</small>
                                    </div>
                                    <div className="border-start ps-4">
                                        <div>{renderStars(averageRating)}</div>
                                        <div className="text-muted small mt-1">Based on {totalReviews} reviews</div>
                                    </div>
                                    <div className="ms-auto">
                                        <button
                                            className="btn btn-success btn-lg px-4"
                                            onClick={handleScheduleAppointment}
                                        >
                                            Schedule Appointment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- REVIEWS LIST --- */}
                <div className="card shadow border-0">
                    <div className="card-header bg-white py-3">
                        <h5 className="mb-0"><i className="bi bi-chat-left-text-fill me-2"></i>Patient Reviews</h5>
                    </div>
                    <div className="card-body">
                        {doctor.reviews && doctor.reviews.length > 0 ? (
                            pagedReviews.map((review) => (
                                <div key={review.reviewId || review.reviewID} className="border-bottom pb-3 mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <h6 className="fw-bold mb-0 text-dark">{review.patientName}</h6>
                                        <small className="text-muted">{new Date(review.reviewDate).toLocaleDateString()}</small>
                                    </div>
                                    <div className="text-warning mb-2" style={{ fontSize: '0.9rem' }}>
                                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                    </div>
                                    <p className="text-secondary mb-0 fst-italic">"{review.comment}"</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-muted">
                                <i className="bi bi-chat-square-dots fs-1 d-block mb-2"></i>
                                No reviews yet for this doctor.
                            </div>
                        )}
                    </div>
                </div>

                {reviews.length > REVIEW_PAGE_SIZE && (
                    <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
                        <button
                            className="btn btn-sm btn-outline-primary"
                            disabled={reviewPage === 1}
                            onClick={() => setReviewPage((prev) => Math.max(1, prev - 1))}
                        >
                            Previous
                        </button>

                        {getPaginationItems(reviewPage, totalReviewPages).map((item, index) =>
                            item === '...' ? (
                                <span key={`dots-${index}`} className="px-2 text-muted">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={item}
                                    className={`btn btn-sm ${item === reviewPage ? 'btn-primary' : 'btn-outline-primary'
                                        }`}
                                    onClick={() => setReviewPage(item)}
                                >
                                    {item}
                                </button>
                            )
                        )}

                        <button
                            className="btn btn-sm btn-outline-primary"
                            disabled={reviewPage === totalReviewPages}
                            onClick={() =>
                                setReviewPage((prev) => Math.min(totalReviewPages, prev + 1))
                            }
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Modal xác nhận đăng nhập */}
            <ConfirmModal
                isOpen={showModal}
                onClose={handleCloseModal}
                onConfirm={handleConfirmLogin}
                title="Authentication Required"
                message="You need to login to book an appointment. Would you like to go to the login page?"
                confirmText="Go to Login"
                iconClass="bi-shield-lock-fill"
                variant="primary"
            />
        </div>
    );
};

export default DoctorPublicProfilePage;
