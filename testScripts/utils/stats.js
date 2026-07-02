'use strict';

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx   = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// Returns common descriptive stats for an array of numbers.
function stats(values) {
  if (values.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, jitter: 0, cv: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum    = values.reduce((s, v) => s + v, 0);
  const mean   = sum / values.length;
  const p50    = percentile(sorted, 50);
  const p95    = percentile(sorted, 95);
  const p99    = percentile(sorted, 99);
  const jitter = values.reduce((s, v) => s + Math.abs(v - mean), 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const cv     = mean !== 0 ? (stddev / mean) * 100 : 0; // coefficient of variation %

  return {
    count: values.length,
    min:   sorted[0],
    max:   sorted[sorted.length - 1],
    mean,
    p50,
    p95,
    p99,
    jitter,
    stddev,
    cv,
  };
}

// Count values strictly above a threshold.
function countAbove(values, threshold) {
  return values.filter(v => v > threshold).length;
}

// Format a number to a fixed number of decimal places, with a units suffix.
function fmt(n, decimals = 2, unit = '') {
  return n.toFixed(decimals) + (unit ? ` ${unit}` : '');
}

// Locale-safe comma-formatted integer (always en-US, regardless of system locale).
function nf(n) {
  return Number(n).toLocaleString('en-US');
}

module.exports = { percentile, stats, countAbove, fmt, nf };
