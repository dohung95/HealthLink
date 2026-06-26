// export const handleAuthenticatedAction = (isAuthenticated, navigate, targetPath) => {
//     if (!isAuthenticated) {
//         const confirmed = window.confirm(
//             "You need to login to book an appointment.\nWould you like to go to the login page?"
//         );
//         if (confirmed) {
//             navigate('/login');
//         }
//     } else {
//         navigate(targetPath);
//     }
// };
export const checkAuthentication = (isAuthenticated) => {
  return isAuthenticated;
};