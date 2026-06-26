import { useAuth } from '../../context/AuthContext';

export default function useDoctorId() {
  const { user } = useAuth();
  return user?.doctorId || null;
}
