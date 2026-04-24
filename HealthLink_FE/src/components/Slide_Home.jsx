import React, { useState, useEffect } from "react";
import "./Css/Slide_Home.css";   // tạo file CSS này ngay bên dưới

const testimonials = [
    {
        name: "Sophia Martinez",
        content: "Booking video consultations from home is so convenient! I can upload my reports, get prescriptions instantly, and never miss a medication reminder. Amazing service!",

        image: "./Hung/PP1.jpg"
    },
    {
        name: "James Williams",
        content: "As a busy professional, this portal saves me hours. Clear doctor profiles, fast scheduling, secure video calls, and all my health records in one place – perfect!",
        image: "./Hung/PP2.jpg"
    },
    {
        name: "Liam Andersson",
        content: "Finally, a platform that keeps my entire medical history organized. The chat feature is great for quick questions, and doctors actually respond fast. Love it!",
        image: "./Hung/PP3.jpg"
    },
    {
        name: "Isabella Costa",
        content: "The video quality is excellent, screen sharing helps a lot, and automatic reminders keep me on track with follow-ups. This is the future of healthcare!",
        image: "./Hung/PP4.jpg"
    },
];

const TestimonialSlider = () => {
    const [current, setCurrent] = useState(0);

    // Tự động chuyển slide mỗi 5 giây
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrent((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="testimonial-section">
            <div className="container">
                <div className="testimonial-slider">
                    {/* Các slide */}
                    {testimonials.map((item, index) => (
                        <div
                            key={index}
                            className={`testimonial-slide ${index === current ? "active" : ""}`}
                        >
                            <div className="testimonial-card">
                                <div >
                                    <img src={item.image} alt="" className="avatar" />
                                </div>
                                <p className="content">“{item.content}”</p>
                                <h4 className="name">- {item.name} -</h4>
                            </div>
                        </div>
                    ))}

                    {/* Dots dưới cùng */}
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