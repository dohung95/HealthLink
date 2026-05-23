import PatientSidebar from "../components/patient-dashboard/PatientSidebar";
import '../components/Css/PatientDashboard.css';
import { Outlet } from "react-router-dom";

/**
 * PatientDashboard - Trang chính cho bệnh nhân
 * - Hiển thị sidebar
 * - Hiển thị nội dung (dashboard, booking, appointments, health-records, prescriptions, profile, settings)
 * - Responsive: Trên mobile, sidebar có thể ẩn và hiển thị qua menu hamburger
 * 
 * @returns
 */

const PatientDashboard = () => {
    return (
        <div className="patient-dashboard-layout">
            <PatientSidebar />

            <main className="patient-dashboard-main">
                <Outlet />
            </main>
        </div>
    );
}

export default PatientDashboard;