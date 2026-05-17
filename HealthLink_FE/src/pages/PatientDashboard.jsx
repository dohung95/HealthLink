import PatientSidebar from "../components/patient-dashboard/PatientSidebar";
import '../components/Css/PatientDashboard.css';
import { Outlet } from "react-router-dom";

const PatientDashboard = () => {
    return (
        <div className="patient-dashboard-layout">
            <PatientSidebar />

            <main className="patient-dashboard-content">
                <Outlet />
            </main>
        </div>
    );
}

export default PatientDashboard;