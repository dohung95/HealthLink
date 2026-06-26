import React, { useState, useEffect } from "react";
import "./Css/Slide_Home.css";
import { doctorReviewApi } from "../api/reviewApi";

// Fallback nếu không có reviews trong database
const fallbackTestimonials = [
    {
        name: "Sophia Martinez",
        content: "Booking video consultations from home is so convenient! I can upload my reports, get prescriptions instantly, and never miss a medication reminder. Amazing service!",
        image: "./Hung/PP1.jpg",
        rating: 5
    },
    {
        name: "James Williams",
        content: "As a busy professional, this portal saves me hours. Clear doctor profiles, fast scheduling, secure video calls, and all my health records in one place – perfect!",
        image: "./Hung/PP2.jpg",
        rating: 5
    },
    {
        name: "Liam Andersson",
        content: "Finally, a platform that keeps my entire medical history organized. The chat feature is great for quick questions, and doctors actually respond fast. Love it!",
        image: "./Hung/PP3.jpg",
        rating: 5
    },
    {
        name: "Isabella Costa",
        content: "The video quality is excellent, screen sharing helps a lot, and automatic reminders keep me on track with follow-ups. This is the future of healthcare!",
        image: "./Hung/PP4.jpg",
        rating: 5
    },
];

const TestimonialSlider = () => {
    const [current, setCurrent] = useState(0);
    const [testimonials, setTestimonials] = useState(fallbackTestimonials);
    const [loading, setLoading] = useState(true);

    // Fetch reviews từ database
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const reviews = await doctorReviewApi.getFeatured(10);
                if (reviews && reviews.length > 0) {
                    const mapped = reviews.map((review, index) => ({
                        name: review.anonymous ? "Anonymous" : (review.patientName || "Patient"),
                        content: review.comment,
                        image: review.patientAvatar || `./Hung/PP${(index % 4) + 1}.jpg`,
                        rating: review.rating,
                        doctorName: review.doctorName,
                        specialty: review.specialtyName
                    }));
                    setTestimonials(mapped);
                }
            } catch (error) {
                console.error("Failed to fetch reviews:", error);
                // Giữ fallback testimonials
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    // Tự động chuyển slide mỗi 5 giây
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrent((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    // Render stars
    const renderStars = (rating) => (
        <div className="rating-stars" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`star ${star <= rating ? "filled" : ""}`}>★</span>
            ))}
        </div>
    );

    return (
        <section className="testimonial-section">
            <div className="container">
                <div className="testimonial-slider">
                    {testimonials.map((item, index) => (
                        <div
                            key={index}
                            className={`testimonial-slide ${index === current ? "active" : ""}`}
                        >
                            <div className="testimonial-card" >
                                <div>
                                    <img src={item.image} alt="" className="avatar" />
                                </div>
                                {renderStars(item.rating)}
                                <p className="content">"{item.content}"</p>
                                <h4 className="name">- {item.name} -</h4>
                                {item.doctorName && (
                                    <p className="doctor-info" style={{ textAlign: 'center', width: '100%', margin: '8px auto 0' }}>
                                        Review for Dr. {item.doctorName}
                                        {item.specialty && ` (${item.specialty})`}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="dots">
                        {testimonials.map((_, index) => (
                            <span
                                key={index}
                                className={`dot ${index === current ? "active" : ""}`}
                                onClick={() => setCurrent(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialSlider;
