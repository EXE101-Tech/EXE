import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCostAmount, formatStoredCost, parseCostInputToVnd, storedCostToInput } from './price.js';

test('accepts shorthand, grouped VND and plain VND without multiplying twice', () => {
  for (const value of ['50', '50.000', '50000']) {
    assert.equal(parseCostInputToVnd(value), 50000);
  }
});

test('editing a stored cost preserves its value, including amounts over a million', () => {
  for (const amount of [0, 1000, 50000, 1000000, 50000000]) {
    assert.equal(parseCostInputToVnd(storedCostToInput(String(amount))), amount);
  }
  assert.equal(formatStoredCost('50000'), '50.000đ/người');
});

test('rejects fractions and invalid costs', () => {
  for (const value of ['', '-50', '50.5', '50,5', '50001', 'abc']) {
    assert.equal(parseCostInputToVnd(value), null);
  }
});

test('room card displays the stored VND amount without changing its scale', () => {
  assert.equal(formatCostAmount('50000'), '50.000đ');
  assert.equal(formatCostAmount('50000000'), '50.000.000đ');
  assert.equal(formatCostAmount('0'), 'Miễn phí');
  assert.equal(formatCostAmount(null), 'Chưa công bố');
});
