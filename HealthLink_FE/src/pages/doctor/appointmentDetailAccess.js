// A doctor may review an appointment in every lifecycle state. Individual tabs
// remain responsible for disabling mutations when an appointment is completed.
export function shouldOpenAppointmentDetail(appointment) {
  return Boolean(appointment);
}
