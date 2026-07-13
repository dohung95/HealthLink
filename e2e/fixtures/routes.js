function jsonRoute(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function routePatientProfile(page, body) {
  return page.route('**/api/account/patient/profile', (route) => jsonRoute(route, body));
}

function routePharmacyProfile(page, body) {
  return page.route('**/api/account/pharmacy/profile', (route) => jsonRoute(route, body));
}

function routeNotifications(page, body = []) {
  return page.route('**/api/notifications**', (route) => jsonRoute(route, body));
}

export { jsonRoute, routePatientProfile, routePharmacyProfile, routeNotifications };
