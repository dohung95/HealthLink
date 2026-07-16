import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FOLLOW_UP_MAP_FALLBACK_CENTER,
  createEmptyFollowUpHomeVisitLocation,
  hasPinnedFollowUpLocation,
  isReusableFollowUpHomeVisitLocation,
  validateFollowUpHomeVisitLocation,
} from '../src/utils/followUpHomeVisitLocation.js';

test('new HomeVisit form uses map fallback only for presentation', () => {
  const form = createEmptyFollowUpHomeVisitLocation();

  assert.deepEqual(FOLLOW_UP_MAP_FALLBACK_CENTER, [10.7769, 106.7009]);
  assert.equal(form.visitLatitude, null);
  assert.equal(form.visitLongitude, null);
  assert.equal(hasPinnedFollowUpLocation(form), false);
});

test('typed details cannot pass without a selected map location', () => {
  const form = {
    ...createEmptyFollowUpHomeVisitLocation(),
    visitAddress: '12 Le Loi',
    contactPhone: '0900000000',
    reasonForHomeVisit: 'Follow-up examination',
  };

  assert.deepEqual(validateFollowUpHomeVisitLocation(form), {
    map: 'Select the visit location on the map.',
  });
});

test('complete self booking passes after selecting a finite map location', () => {
  const form = {
    ...createEmptyFollowUpHomeVisitLocation(),
    visitAddress: '12 Le Loi',
    contactPhone: '0900000000',
    reasonForHomeVisit: 'Follow-up examination',
    visitLatitude: 10.762622,
    visitLongitude: 106.660172,
  };

  assert.deepEqual(validateFollowUpHomeVisitLocation(form), {});
  assert.equal(isReusableFollowUpHomeVisitLocation(form), true);
});

test('booking for another person requires every receiver field', () => {
  const form = {
    ...createEmptyFollowUpHomeVisitLocation(),
    visitAddress: '12 Le Loi',
    contactPhone: '0900000000',
    reasonForHomeVisit: 'Follow-up examination',
    visitLatitude: 10.762622,
    visitLongitude: 106.660172,
    isForSelf: false,
  };

  assert.deepEqual(validateFollowUpHomeVisitLocation(form), {
    receiverName: 'Receiver name is required.',
    receiverAge: 'Receiver age is required.',
    receiverGender: 'Receiver gender is required.',
    receiverRelationship: 'Relationship is required.',
    receiverPhone: 'Receiver phone is required.',
  });
});

test('source details missing receiver gender cannot skip the Location step', () => {
  const sourceDetails = {
    ...createEmptyFollowUpHomeVisitLocation(),
    visitAddress: '12 Le Loi',
    contactPhone: '0900000000',
    reasonForHomeVisit: 'Follow-up examination',
    visitLatitude: 10.762622,
    visitLongitude: 106.660172,
    isForSelf: false,
    receiverName: 'Nguyen Van B',
    receiverAge: 43,
    receiverRelationship: 'Parent',
    receiverPhone: '0900111222',
  };

  assert.equal(isReusableFollowUpHomeVisitLocation(sourceDetails), false);
});

test('source details with out-of-range coordinates cannot skip the Location step', () => {
  const sourceDetails = {
    ...createEmptyFollowUpHomeVisitLocation(),
    visitAddress: '12 Le Loi',
    contactPhone: '0900000000',
    reasonForHomeVisit: 'Follow-up examination',
    visitLatitude: 999,
    visitLongitude: 106.660172,
  };

  assert.equal(isReusableFollowUpHomeVisitLocation(sourceDetails), false);
});
