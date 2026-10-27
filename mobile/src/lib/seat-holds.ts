import { getVietnamDate, slotStart, toUtcEpoch, toVietnamTimeInput } from '@/lib/slots';
import type { MatchParticipantResponse, MatchResponse } from '@/schemas/gamerooms';

/**
 * Helpers for rooms whose Premium host turned on timed seat holds + a waitlist (web: roomTiming.js and the
 * seat-hold branches of RoomCard / JoinRoomModal). Older servers never send the new fields, so every helper
 * falls back to the plain room behaviour.
 */

/** Consent the server asks for when someone requests a seat or joins the standby list of a seat-hold room. */
export interface JoinConsent {
  accepted_hold_policy: boolean;
  terms_version: string | null;
  expected_arrival_at: string | null;
}

/** Consent for accepting an invitation to a seat-hold room. */
export interface InviteConsent {
  accepted_policy: boolean;
  terms_version: string | null;
}

/** `AUTO` invites come from the Premium auto-invite, `WAITLIST` ones from the standby list. */
export const INVITE_SOURCES = ['AUTO', 'WAITLIST'];

/** Within this many minutes of the start time the host needs the player's expected arrival time. */
export const SOON_MINUTES = 30;

type Membership = Pick<MatchParticipantResponse, 'status' | 'invite_source'>;

/** A pending row that is an invitation sent to the player (not a request the player made). */
export function isInviteParticipant(participant?: Membership | null): boolean {
  return participant?.status === 'PENDING' && INVITE_SOURCES.includes(participant.invite_source ?? '');
}

export function minutesUntil(iso: string): number {
  return Math.floor((toUtcEpoch(iso) - Date.now()) / 60000);
}

/** The room starts in under 30 minutes (or already started): arrival time must accompany a seat request. */
export function isStartingSoon(room: Pick<MatchResponse, 'start_time'>): boolean {
  return minutesUntil(room.start_time) < SOON_MINUTES;
}

/** Seats really free, after approved members and invitations that are still waiting for an answer. */
export function availableSeats(room: MatchResponse): number {
  const approved = room.participants.filter((p) => p.status === 'APPROVED').length;
  return room.roster_summary?.available ?? Math.max(0, room.max_players - approved);
}

/** `HH:mm dd/MM` in Vietnam time. */
export function formatDeadline(iso: string): string {
  // Built from parts so the separators are the same on every device (Intl prints "26-10" on some of them).
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(toUtcEpoch(iso)));
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.hour}:${value.minute} ${value.day}/${value.month}`;
}

export function isDeadlinePassed(iso: string): boolean {
  return toUtcEpoch(iso) <= Date.now();
}

/** "Còn 25 phút", "Còn 1 giờ 5 phút" or "Đã hết hạn". */
export function timeLeftLabel(iso: string): string {
  const minutes = Math.ceil((toUtcEpoch(iso) - Date.now()) / 60000);
  if (minutes <= 0) return 'Đã hết hạn';
  if (minutes < 60) return `Còn ${minutes} phút`;
  return `Còn ${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

/** Whether the host still lacks a usable arrival time for this request (only needed close to the start). */
export function needsArrivalTime(room: MatchResponse, participant: MatchParticipantResponse): boolean {
  if (!room.seat_holds_enabled || !isStartingSoon(room)) return false;
  return !participant.expected_arrival_at || toUtcEpoch(participant.expected_arrival_at) < Date.now();
}

/** `HH:mm` to prefill the arrival field: the start time, but never earlier than ten minutes from now. */
export function defaultArrivalTime(room: Pick<MatchResponse, 'start_time' | 'end_time'>): string {
  const earliest = Date.now() + 10 * 60000;
  const latest = toUtcEpoch(room.end_time) - 60000;
  const target = Math.min(Math.max(toUtcEpoch(room.start_time), earliest), latest);
  return toVietnamTimeInput(new Date(target).toISOString());
}

/**
 * Turns an `HH:mm` Vietnam wall-clock time into the ISO instant the server expects, choosing today or tomorrow
 * (rooms can run past midnight). The server needs it to be after now and before the room ends.
 */
export function arrivalToIso(time: string, room: Pick<MatchResponse, 'end_time'>): string | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const now = Date.now();
  const end = toUtcEpoch(room.end_time);
  for (const offset of [0, 1]) {
    const instant = slotStart(getVietnamDate(offset), time).getTime();
    if (instant > now && instant < end) return new Date(instant).toISOString();
  }
  return null;
}
