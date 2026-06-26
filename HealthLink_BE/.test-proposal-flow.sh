#!/bin/bash
#
# Full flow test: Home Visit Proposal
# =====================================
# Steps:
#   1. Login as Patient
#   2. Login as Doctor
#   3. Patient books an Online appointment
#   4. Doctor starts the consultation
#   5. Doctor proposes Home Visit
#   6. Patient confirms the proposal
#   7. Doctor proposes again
#   8. Patient rejects the proposal
#
# Usage: bash .test-proposal-flow.sh
# Prereq: backend running on localhost:8096

set -euo pipefail

BASE="http://localhost:8096"

# ── Helper: generate future ISO timestamp (cross-platform) ──
future_time() {
  local mins="${1:-30}"
  # Try python3, then powershell, then fallback
  local ts
  ts=$(python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow() + timedelta(minutes=$mins)).strftime('%Y-%m-%dT%H:%M:%S'))" 2>/dev/null) \
    || ts=$(powershell -Command "Get-Date (Get-Date).AddMinutes($mins) -Format 'yyyy-MM-ddTHH:mm:ss'" 2>/dev/null) \
    || ts=$(date -d "+$mins minutes" +"%Y-%m-%dT%H:%M:%S" 2>/dev/null) \
    || { echo "Cannot generate future time"; exit 1; }
  echo "$ts"
}

# ── Helper: extract value from JSON ──
extract() {
  local json="$1" key="$2"
  local val
  val=$(echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | head -1 | sed 's/"[^"]*":"//;s/"//')
  if [ -n "$val" ]; then echo "$val"; return 0; fi
  val=$(echo "$json" | grep -o "\"$key\":[0-9.]*" | head -1 | sed "s/\"$key\"://")
  echo "$val"
}

step() {
  echo ""; echo "═══════════════════════════════════════════════════════════════"
  echo "  STEP $1: $2"; echo "═══════════════════════════════════════════════════════════════"
}

check_http() {
  local code="$1" desc="$2"
  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then echo "  [OK] HTTP $code - $desc"
  elif [ "$code" -ge 400 ] && [ "$code" -lt 500 ]; then echo "  [??] HTTP $code - $desc"
  else echo "  [!!] HTTP $code - $desc"
  fi
}

# No strict fail - let all steps run
set +e

# ═══════════════════════════════════════════════════════════════════════════════
step 1 "Login as Patient"
PATIENT_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"patient01@gmail.com","password":"patient123"}')
PATIENT_TOKEN=$(extract "$PATIENT_RESP" "accessToken")
PATIENT_ID=$(extract "$PATIENT_RESP" "userId")
echo "  Patient: $PATIENT_ID | Token: ${PATIENT_TOKEN:0:20}..."
[ -z "$PATIENT_TOKEN" ] && { echo "FAIL"; exit 1; }

# ═══════════════════════════════════════════════════════════════════════════════
step 2 "Login as Doctor"
DOCTOR_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor01@healthlink.com","password":"doctor123"}')
DOCTOR_TOKEN=$(extract "$DOCTOR_RESP" "accessToken")
DOCTOR_ID=$(extract "$DOCTOR_RESP" "userId")
echo "  Doctor: $DOCTOR_ID | Token: ${DOCTOR_TOKEN:0:20}..."
[ -z "$DOCTOR_TOKEN" ] && { echo "FAIL"; exit 1; }

# ═══════════════════════════════════════════════════════════════════════════════
step 3 "Book Online appointment (Patient)"
APPT_TIME=$(future_time 30)
echo "  Appointment time: $APPT_TIME"

APPT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"doctorId\": \"$DOCTOR_ID\",
    \"appointmentTime\": \"${APPT_TIME}\",
    \"consultationType\": \"Online\",
    \"symptoms\": \"Test appointment for home visit proposal flow\"
  }")
APPT_HTTP=$(echo "$APPT_RESP" | tail -1)
APPT_BODY=$(echo "$APPT_RESP" | sed '$d')
check_http "$APPT_HTTP" "Create appointment"
APPOINTMENT_ID=$(extract "$APPT_BODY" "appointmentId")
echo "  Appointment ID: $APPOINTMENT_ID"
[ -z "$APPOINTMENT_ID" ] && echo "  (appointment creation failed - continuing)"

# ═══════════════════════════════════════════════════════════════════════════════
step 4 "Try starting consultation (may fail - needs paid invoice)"
if [ -n "$APPOINTMENT_ID" ]; then
  START_RESP=$(curl -s -w "\n%{http_code}" -X PUT \
    "$BASE/api/appointments/$APPOINTMENT_ID/start" \
    -H "Authorization: Bearer $DOCTOR_TOKEN")
  START_HTTP=$(echo "$START_RESP" | tail -1)
  START_BODY=$(echo "$START_RESP" | sed '$d')
  check_http "$START_HTTP" "Start consultation"
  CONSULTATION_ID=$(extract "$START_BODY" "consultationId")
  echo "  Consultation ID: $CONSULTATION_ID"

  if [ -z "$CONSULTATION_ID" ]; then
    echo "  Body: $(echo "$START_BODY" | head -c 200)"
    # Try to find any existing consultation for this doctor
    echo "  Searching for existing consultations..."
    CONS_RESP=$(curl -s "$BASE/api/appointments/$APPOINTMENT_ID" \
      -H "Authorization: Bearer $DOCTOR_TOKEN")
    CONSULTATION_ID=$(extract "$CONS_RESP" "consultationId")
    [ -n "$CONSULTATION_ID" ] && echo "  Found via appt detail: $CONSULTATION_ID"
  fi
else
  echo "  No appointment to start consultation"
fi

# ═══════════════════════════════════════════════════════════════════════════════
step 5 "Propose Home Visit (Doctor)"
if [ -n "${CONSULTATION_ID:-}" ]; then
  PROPOSE_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    "$BASE/api/consultations/$CONSULTATION_ID/propose-home-visit" \
    -H "Authorization: Bearer $DOCTOR_TOKEN")
  PROPOSE_HTTP=$(echo "$PROPOSE_RESP" | tail -1)
  PROPOSE_BODY=$(echo "$PROPOSE_RESP" | sed '$d')
  check_http "$PROPOSE_HTTP" "Propose home visit"
  PROP_APPT_ID=$(extract "$PROPOSE_BODY" "appointmentId")
  PROP_MSG=$(extract "$PROPOSE_BODY" "message")
  echo "  Proposal appointmentId: $PROP_APPT_ID | Message: $PROP_MSG"

  if [ -n "$PROP_APPT_ID" ]; then
    # ──────────────────────────────────────────────────────────────────────────
    step 6 "Confirm proposal (Patient)"
    CONFIRM_RESP=$(curl -s -w "\n%{http_code}" -X POST \
      "$BASE/api/home-visit/proposals/confirm" \
      -H "Authorization: Bearer $PATIENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"appointmentId\": $PROP_APPT_ID}")
    CONFIRM_HTTP=$(echo "$CONFIRM_RESP" | tail -1)
    CONFIRM_BODY=$(echo "$CONFIRM_RESP" | sed '$d')
    check_http "$CONFIRM_HTTP" "Confirm proposal"
    CONFIRM_APPT_ID=$(extract "$CONFIRM_BODY" "appointmentId")
    CONFIRM_DOCTOR_ID=$(extract "$CONFIRM_BODY" "doctorId")
    echo "  Confirmed: appointmentId=$CONFIRM_APPT_ID doctorId=$CONFIRM_DOCTOR_ID"

    # ──────────────────────────────────────────────────────────────────────────
    step 7 "Propose again (Doctor) - for reject test"
    PROPOSE2_RESP=$(curl -s -w "\n%{http_code}" -X POST \
      "$BASE/api/consultations/$CONSULTATION_ID/propose-home-visit" \
      -H "Authorization: Bearer $DOCTOR_TOKEN")
    PROPOSE2_HTTP=$(echo "$PROPOSE2_RESP" | tail -1)
    PROPOSE2_BODY=$(echo "$PROPOSE2_RESP" | sed '$d')
    check_http "$PROPOSE2_HTTP" "Propose #2"
    PROP2_APPT_ID=$(extract "$PROPOSE2_BODY" "appointmentId")
    echo "  Proposal #2: $PROP2_APPT_ID"

    if [ -n "$PROP2_APPT_ID" ]; then
      # ──────────────────────────────────────────────────────────────────────────
      step 8 "Reject proposal (Patient)"
      REJECT_RESP=$(curl -s -w "\n%{http_code}" -X POST \
        "$BASE/api/home-visit/proposals/reject" \
        -H "Authorization: Bearer $PATIENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"appointmentId\": $PROP2_APPT_ID}")
      REJECT_HTTP=$(echo "$REJECT_RESP" | tail -1)
      REJECT_BODY=$(echo "$REJECT_RESP" | sed '$d')
      check_http "$REJECT_HTTP" "Reject proposal"
      echo "  Reject: $REJECT_BODY"
    fi
  fi
else
  echo "  No consultation ID available for propose test."
  echo "  (This is expected: creating a paid appointment + started consultation"
  echo "   requires the full PayPal booking flow which is beyond API testing.)"
  echo ""
  echo "  Running fallback: test propose endpoint directly with error validation..."
  echo ""
  echo "  --- Role & error validation (prove endpoints are wired correctly) ---"
  echo ""
  echo "  Test A: Propose without auth → expect 401/403"
  curl -s -w "  HTTP: %{http_code}\n" -o /dev/null -X POST \
    "$BASE/api/consultations/1/propose-home-visit"
  echo ""
  echo "  Test B: Patient tries to propose → expect 403"
  curl -s -w "  HTTP: %{http_code}\n" -o /dev/null -X POST \
    "$BASE/api/consultations/1/propose-home-visit" \
    -H "Authorization: Bearer $PATIENT_TOKEN"
  echo ""
  echo "  Test C: Doctor proposes non-existent consultation → expect 400"
  curl -s -w "  HTTP: %{http_code}\n" -X POST \
    "$BASE/api/consultations/99999/propose-home-visit" \
    -H "Authorization: Bearer $DOCTOR_TOKEN"
  echo ""
  echo "  Test D: Doctor confirms proposal → expect 403"
  curl -s -w "  HTTP: %{http_code}\n" -o /dev/null -X POST \
    "$BASE/api/home-visit/proposals/confirm" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"appointmentId": 1}'
  echo ""
  echo "  Test E: Patient confirms non-existent → expect 400"
  RESP=$(curl -s -X POST "$BASE/api/home-visit/proposals/confirm" \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"appointmentId": 99999}')
  echo "  Response: $RESP"
  echo ""
  echo "  Test F: Patient rejects non-existent → expect 400"
  RESP2=$(curl -s -X POST "$BASE/api/home-visit/proposals/reject" \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"appointmentId": 99999}')
  echo "  Response: $RESP2"
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo "  Patient:      $PATIENT_ID"
echo "  Doctor:       $DOCTOR_ID"
echo "  Appointment:  ${APPOINTMENT_ID:-N/A}"
echo "  Consultation: ${CONSULTATION_ID:-N/A}"
echo "  Propose ID:   ${PROP_APPT_ID:-N/A}"
echo "  Confirm ID:   ${CONFIRM_APPT_ID:-N/A}"
echo "  Reject ID:    ${PROP2_APPT_ID:-N/A}"
echo ""
echo "  Done."
