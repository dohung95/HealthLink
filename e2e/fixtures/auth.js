function makeToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.fake-sig`;
}

const EXP_FAR = Math.floor(Date.now() / 1000) + 86400;

const PATIENT_TOKEN = makeToken({
  sub: 'patient-1', role: 'Patient', preferred_username: 'Test Patient', exp: EXP_FAR,
});
const PHARMACY_TOKEN = makeToken({
  sub: 'pharmacy-1', role: 'Pharmacy', preferred_username: 'Test Pharmacy', exp: EXP_FAR,
});
const DOCTOR_TOKEN = makeToken({
  sub: 'doctor-1', role: 'Doctor', preferred_username: 'Test Doctor', exp: EXP_FAR,
});

export { makeToken, PATIENT_TOKEN, PHARMACY_TOKEN, DOCTOR_TOKEN };
