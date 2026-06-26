/**
 * Map từ value trong DB sang icon và mô tả hiển thị.
 * Nếu backend thêm loại mới, chỉ cần thêm ở đây.
 */
const TYPE_META = {
    Online: {
        title: 'Online consultation',
        description: 'Meet the doctor remotely through HealthLink.',
        icon: 'bi bi-laptop',
    },
    HomeVisit: {
        title: 'Home visit',
        description: 'A family doctor visits you or your relative at home.',
        icon: 'bi bi-house-heart',
    },
};

/**
 * ConsultationStep - Hiển thị danh sách hình thức tư vấn mà bác sĩ hỗ trợ.
 * Dữ liệu đọc từ `availableTypes` của DoctorResponse (database),
 * không hardcode cứng.
 *
 * @param {string[]} availableTypes - Mảng các type từ DB, e.g. ["Video", "Chat"]
 */
const ConsultationStep = ({
    consultationType,
    onSelectConsultation,
    onNext,
    onBack,
    canGoBack = true,
    availableTypes = [],
}) => {
    // Nếu DB không trả về availableTypes hoặc rỗng, fallback hiển thị tất cả type đã biết
    const typesToShow = ['Online', 'HomeVisit'];

    return (
        <div className="schedule-card">
            <h2>Choose consultation type</h2>
            <p className="schedule-card-subtitle">
                Choose the way you want to meet the doctor.
            </p>

            {typesToShow.length === 0 ? (
                <div className="empty-block">
                    This doctor has no available consultation types.
                </div>
            ) : (
                <div className="consultation-grid">
                    {typesToShow.map((type) => {
                        // Lấy metadata hiển thị, fallback nếu type chưa có trong map
                        const meta = TYPE_META[type] ?? {
                            title: type,
                            description: `Consultation via ${type.toLowerCase()}`,
                            icon: 'bi bi-person-badge',
                        };

                        return (
                            <button
                                key={type}
                                type="button"
                                className={`consultation-card ${consultationType === type ? 'selected' : ''}`}
                                onClick={() => onSelectConsultation(type)}
                            >
                                <i className={meta.icon}></i>
                                <h3>{meta.title}</h3>
                                <p>{meta.description}</p>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="schedule-actions">
                {canGoBack && (
                    <button type="button" className="btn-outline-soft" onClick={onBack}>
                        Back
                    </button>
                )}

                <button
                    type="button"
                    className="btn-primary-soft"
                    onClick={onNext}
                    disabled={!consultationType}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default ConsultationStep;