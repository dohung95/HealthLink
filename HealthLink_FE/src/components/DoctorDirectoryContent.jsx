import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doctorService } from '../api/doctorApi';
import './Css/DoctorDirectory.css';

const DoctorDirectoryContent = ({
    title = 'Available Doctors',
    pageSize = 5,
    showCloseButton = false,
    onClose,
    onViewProfile,
    onBookDoctor
}) => {
    const [doctors, setDoctors] = useState([]);
    const [specialties, setSpecialties] = useState([]);

    const [searchParams] = useSearchParams();

    const [filters, setFilters] = useState({
        name: '',
        specialty: searchParams.get('specialty') ? decodeURIComponent(searchParams.get('specialty')) : '',
        location: ''
    });

    const [pagination, setPagination] = useState({
        page: 1,
        pageSize,
        totalPages: 1,
        totalItems: 0
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSpecialties();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadDoctors();
        }, 500);

        return () => clearTimeout(timer);
    }, [pagination.page, pagination.pageSize, filters]);

    const loadSpecialties = async () => {
        try {
            const data = await doctorService.getSpecialties();
            setSpecialties(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('[DoctorDirectoryContent] load specialties error:', error);
            setSpecialties([]);
        }
    };

    const loadDoctors = async () => {
        setLoading(true);

        try {
            const params = {
                ...filters,
                page: pagination.page,
                pageSize: pagination.pageSize
            };

            const data = await doctorService.searchDoctors(params);

            if (data?.items) {
                setDoctors(data.items);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: data.totalPages || 1,
                    totalItems: data.totalItems || 0
                }));
            } else if (Array.isArray(data)) {
                setDoctors(data);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: 1,
                    totalItems: data.length
                }));
            } else {
                setDoctors([]);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: 1,
                    totalItems: 0
                }));
            }
        } catch (error) {
            console.error('[DoctorDirectoryContent] load doctors error:', error);
            setDoctors([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value
        }));

        setPagination((prev) => ({
            ...prev,
            page: 1
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            name: '',
            specialty: '',
            location: ''
        });

        setPagination((prev) => ({
            ...prev,
            page: 1
        }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination((prev) => ({
                ...prev,
                page: newPage
            }));
        }
    };

    const getPaginationItems = (current, total) => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let lastPage;

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
            if (lastPage) {
                if (page - lastPage === 2) {
                    rangeWithDots.push(lastPage + 1);
                } else if (page - lastPage > 2) {
                    rangeWithDots.push('...');
                }
            }

            rangeWithDots.push(page);
            lastPage = page;
        }

        return rangeWithDots;
    };

    const getInitials = (name = '') =>
        name
            .split(' ')
            .slice(-2)
            .map((word) => word[0]?.toUpperCase() ?? '')
            .join('');

    const renderStars = (rating = 0) => {
        const rounded = Math.round(rating);
        return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
    };

    return (
        <div className="doctor-directory">
            <div className="doctor-directory-header">
                <div>
                    <h2>{title}</h2>
                    <p>{pagination.totalItems} doctors found</p>
                </div>

                {showCloseButton && (
                    <button className="doctor-directory-close" onClick={onClose}>
                        ×
                    </button>
                )}
            </div>

            <div className="doctor-directory-layout">
                <aside className="doctor-directory-filters">
                    <h3>Filter Doctors</h3>

                    <div className="filter-group">
                        <label>Specialty</label>
                        <select
                            name="specialty"
                            value={filters.specialty}
                            onChange={handleFilterChange}
                        >
                            <option value="">All specialties</option>
                            {specialties.map((spec) => (
                                <option key={spec} value={spec}>
                                    {spec}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Location</label>
                        <input
                            type="text"
                            name="location"
                            placeholder="e.g. Houston"
                            value={filters.location}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Doctor name"
                            value={filters.name}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <button
                        className="clear-filter-btn"
                        onClick={handleClearFilters}
                    >
                        Clear filters
                    </button>
                </aside>

                <main className="doctor-directory-list">
                    {loading ? (
                        <p className="doctor-directory-message">Loading doctors...</p>
                    ) : doctors.length === 0 ? (
                        <p className="doctor-directory-message">No doctors found.</p>
                    ) : (
                        doctors.map((doc) => {
                            const resolvedDoctorId = doc.doctorId || doc.doctorID;

                            return (
                                <div key={resolvedDoctorId} className="doctor-directory-item">
                                    <div className="doctor-avatar">
                                        {getInitials(doc.fullName)}
                                    </div>

                                    <div className="doctor-main-info">
                                        <h4>{doc.fullName}</h4>
                                        <p className="doctor-specialty">
                                            {doc.specialtyName || doc.specialty}
                                        </p>

                                        <div className="doctor-meta">
                                            <span>{doc.location || 'Location N/A'}</span>
                                            <span>{doc.languageSpoken || 'Language N/A'}</span>
                                            <span>{doc.yearsOfExperience || 0} years exp</span>
                                        </div>

                                        <div className="doctor-rating">
                                            <span>{renderStars(doc.averageRating)}</span>
                                            <small>({doc.totalReviews || 0} reviews)</small>
                                        </div>
                                    </div>

                                    <div className="doctor-actions">
                                        <button
                                            className="view-profile-btn"
                                            onClick={() => onViewProfile?.(resolvedDoctorId)}
                                            disabled={!resolvedDoctorId}
                                        >
                                            View Profile
                                        </button>

                                        <button
                                            className="book-now-btn"
                                            onClick={() => onBookDoctor?.(resolvedDoctorId)}
                                            disabled={!resolvedDoctorId}
                                        >
                                            Book
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="doctor-pagination">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                            >
                                Prev
                            </button>

                            {getPaginationItems(
                                pagination.page,
                                pagination.totalPages
                            ).map((item, index) =>
                                item === '...' ? (
                                    <span key={`dots-${index}`} className="doctor-page-dots">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={item}
                                        className={`doctor-page-number ${item === pagination.page ? 'active' : ''
                                            }`}
                                        onClick={() => handlePageChange(item)}
                                    >
                                        {item}
                                    </button>
                                )
                            )}

                            <button
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default DoctorDirectoryContent;