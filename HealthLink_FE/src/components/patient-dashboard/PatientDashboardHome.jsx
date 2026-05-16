import PatientHeader from './PatientHeader';
import PatientStats from './PatientStats';
import QuickActions from './QuickActions';

const PatientDashboardHome = () => {
  return (
    <>
      <PatientHeader />
      <PatientStats />
      <QuickActions />
    </>
  );
};

export default PatientDashboardHome;
