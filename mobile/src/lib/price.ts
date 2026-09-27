// Ported from client/src/shared/utils/price.js — keep behavior identical so
// venue/gameroom/LFG price fields parse the same "thousands VND" free-text
// pattern on mobile as on web (e.g. "50" or "50.000" both mean 50,000đ).

const GROUPED_VND_PATTERN = /^\d{1,3}(?:\.\d{3})+$/;

export function parseCostInputToVnd(value: unknown): number | null {
  const input = String(value ?? '').trim();
  let amount: number;

  if (/^\d+$/.test(input)) {
    amount = Number(input) * 1000;
  } else if (GROUPED_VND_PATTERN.test(input)) {
    amount = Number(input.replaceAll('.', ''));
  } else {
    return null;
  }

  if (!Number.isSafeInteger(amount) || amount < 0 || amount % 1000 !== 0) return null;
  return amount;
}

export function parseStoredCostToVnd(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const input = String(value).trim();
  if (/^\d+[.,]\d+$/.test(input) && !GROUPED_VND_PATTERN.test(input)) return null;
  if (/\bfree\b|miễn phí/i.test(input)) return 0;
  const groupedMatch = input.match(/\d{1,3}(?:\.\d{3})+/);
  const digitsMatch = input.match(/\d+/);
  const token = groupedMatch?.[0] || digitsMatch?.[0];
  if (!token) return null;

  const amount = token.includes('.')
    ? Number(token.replaceAll('.', ''))
    : Number(token) < 1000
      ? Number(token) * 1000
      : Number(token);

  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function storedCostToInput(value: unknown): string {
  const amount = parseStoredCostToVnd(value);
  return amount !== null && amount % 1000 === 0 ? String(amount / 1000) : '';
}

export function formatStoredCost(value: unknown): string {
  const amount = parseStoredCostToVnd(value);
  if (amount === null) return String(value || 'Chưa cập nhật');
  return `${amount.toLocaleString('vi-VN')}đ/người`;
}
