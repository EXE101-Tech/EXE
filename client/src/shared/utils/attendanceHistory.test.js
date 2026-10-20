import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAttendanceHistory } from './attendanceHistory.js';

const event = (id, type, details = {}, overrides = {}) => ({ id, type, details, actor_id: 1, actor_name: 'Minh', subject_id: 2, subject_name: 'Lan', created_at: `2026-10-20T02:00:${String(id).padStart(2, '0')}`, ...overrides });

test('hides code rotations and names the actor and the person being approved', () => {
  const activities = buildAttendanceHistory([event(1, 'MEMBERSHIP_UPDATED', { status: 'APPROVED' }), event(2, 'CHECKIN_OPENED')]);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].title, 'Minh duyệt Lan vào phòng');
});

test('names peer confirmations and treats withdrawing a vote separately from an absence report', () => {
  const activities = buildAttendanceHistory([
    event(1, 'PEER_REPORTED', { attended: true }),
    event(2, 'PEER_REPORTED', { attended: false }),
  ], 2);
  assert.equal(activities[1].title, 'Minh xác nhận bạn có mặt');
  assert.equal(activities[0].title, 'Minh bỏ xác nhận có mặt của bạn');
  assert.equal(activities[0].kind, 'result');
});

test('labels supplemental attendance without presenting it as prior consent or a code check-in', () => {
  const activities = buildAttendanceHistory([
    event(1, 'SELF_REPORTED', { occurred: true, attended: true, supplemental: true }, { actor_id: 2 }),
  ], 2);
  assert.equal(activities[0].title, 'Bạn khai báo có mặt bổ sung');
});

test('merges old duplicate removal records and distinguishes host removal from voluntary cancellation', () => {
  const activities = buildAttendanceHistory([
    event(1, 'CANCELLED_PARTICIPATION', { status_before: 'APPROVED', reason: 'Chủ phòng từ chối hoặc gỡ thành viên' }),
    event(2, 'MEMBERSHIP_UPDATED', { status: 'REJECTED' }),
    event(3, 'CANCELLED_PARTICIPATION', { had_commitment: true, late: true, reason: 'Bận đột xuất' }, { actor_id: 2, actor_name: 'Lan' }),
  ]);
  assert.equal(activities.length, 2);
  assert.equal(activities[1].title, 'Minh gỡ Lan khỏi phòng');
  assert.equal(activities[1].description, '');
  assert.equal(activities[0].title, 'Lan hủy tham gia');
  assert.match(activities[0].description, /Bận đột xuất.*hủy sát giờ/);
});

test('groups one schedule change across participants without hiding separate changes', () => {
  const activities = buildAttendanceHistory([
    event(1, 'TERMS_CHANGED', { previous_terms: { location: 'Sân A' } }),
    event(2, 'TERMS_CHANGED', { previous_terms: { location: 'Sân A' } }, { subject_id: 3 }),
    event(3, 'TERMS_CHANGED', { previous_terms: { location: 'Sân B' } }),
  ]);
  assert.equal(activities.length, 2);
  assert.equal(activities[0].id, 3);
  assert.equal(activities[1].id, 2);
});

test('personalizes own actions and does not repeat the whole schedule after confirmation', () => {
  const activities = buildAttendanceHistory([event(1, 'CONFIRMED', { terms: { price_info: '50000', location: 'Sân A' } }, { actor_id: 2 })], 2);
  assert.equal(activities[0].title, 'Bạn xác nhận sẽ tham gia');
  assert.equal(activities[0].description, '');
});

test('shows one room change with before/after values instead of one entry per participant', () => {
  const activities = buildAttendanceHistory([
    event(1, 'ROOM_UPDATED', { changes: { location: { before: 'Sân A', after: 'Sân B' }, price_info: { before: '50000', after: '60000' } } }),
    event(2, 'TERMS_CHANGED', { room_update: true }),
    event(3, 'TERMS_CHANGED', { room_update: true }, { subject_id: 3 }),
  ]);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].title, 'Minh cập nhật thông tin buổi chơi');
  assert.equal(activities[0].description, 'Địa điểm: Sân A → Sân B\nChi phí: 50.000đ/người → 60.000đ/người');
});

test('uses truthful labels for pending rejection, withdrawal and legacy removal', () => {
  assert.equal(buildAttendanceHistory([event(1, 'CANCELLED_PARTICIPATION', { status_before: 'PENDING' })])[0].title, 'Minh từ chối yêu cầu tham gia của Lan');
  assert.equal(buildAttendanceHistory([event(1, 'CANCELLED_PARTICIPATION', { status_before: 'PENDING' }, { actor_id: 2, actor_name: 'Lan' })])[0].title, 'Lan rút yêu cầu tham gia');
  assert.equal(buildAttendanceHistory([event(1, 'CANCELLED_PARTICIPATION')])[0].title, 'Lan không còn trong phòng');
});
