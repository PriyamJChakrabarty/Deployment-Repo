'use strict';
const fs   = require('fs');
const path = require('path');

// ANSI colour palette
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  cyan:    '\x1b[36m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
};

const WIDTH = 72; // inner usable width between the box walls

function strip(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function pad(s, len, char = ' ') {
  const visible = strip(s).length;
  return s + char.repeat(Math.max(0, len - visible));
}

function centre(s, width) {
  const len   = strip(s).length;
  const left  = Math.floor((width - len) / 2);
  const right = width - len - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

class Logger {
  constructor(filename) {
    const logDir = path.join(__dirname, '..', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    this.logPath = path.join(logDir, filename);
    this.stream  = fs.createWriteStream(this.logPath, { flags: 'w' });
  }

  // Write one line to stdout (coloured) and to file (plain)
  _line(coloured, plain) {
    process.stdout.write(coloured + '\n');
    this.stream.write((plain ?? strip(coloured)) + '\n');
  }

  // ── decorators ──────────────────────────────────────────────────────

  header(title) {
    const bar  = '═'.repeat(WIDTH);
    const ts   = new Date().toISOString();
    this._line('');
    this._line(
      `${C.bold}${C.cyan}╔${bar}╗${C.reset}`,
      `╔${bar}╗`
    );
    this._line(
      `${C.bold}${C.cyan}║${C.white}${centre(C.bold + title + C.reset, WIDTH + 8)}${C.cyan}║${C.reset}`,
      `║${centre(title, WIDTH)}║`
    );
    this._line(
      `${C.cyan}║${C.dim}${centre(ts, WIDTH)}${C.reset}${C.cyan}║${C.reset}`,
      `║${centre(ts, WIDTH)}║`
    );
    this._line(
      `${C.cyan}╚${bar}╝${C.reset}`,
      `╚${bar}╝`
    );
  }

  section(title) {
    const inner = WIDTH - 2;
    const bar   = '─'.repeat(inner);
    this._line('');
    this._line(
      `${C.bold}${C.blue}  ┌${bar}┐${C.reset}`,
      `  ┌${bar}┐`
    );
    this._line(
      `${C.blue}  │${C.bold}${C.white} ${pad(title, inner - 1)}${C.reset}${C.blue}│${C.reset}`,
      `  │ ${pad(title, inner - 1)}│`
    );
    this._line(
      `${C.blue}  └${bar}┘${C.reset}`,
      `  └${bar}┘`
    );
  }

  // ── status badges ────────────────────────────────────────────────────

  pass(msg) {
    this._line(`    ${C.green}${C.bold}✔ PASS${C.reset}  ${msg}`, `    ✔ PASS  ${msg}`);
  }

  fail(msg) {
    this._line(`    ${C.red}${C.bold}✘ FAIL${C.reset}  ${msg}`, `    ✘ FAIL  ${msg}`);
  }

  warn(msg) {
    this._line(`    ${C.yellow}${C.bold}⚠ WARN${C.reset}  ${msg}`, `    ⚠ WARN  ${msg}`);
  }

  info(msg) {
    this._line(`    ${C.dim}${msg}${C.reset}`, `    ${msg}`);
  }

  blank() {
    this._line('', '');
  }

  // ── metric line with dot-leader ──────────────────────────────────────

  metric(label, value, unit = '', note = '') {
    const LABEL_W = 42;
    const dotted  = label + ' ' + '.'.repeat(Math.max(1, LABEL_W - label.length - 1));
    const valStr  = unit ? `${value} ${unit}` : String(value);
    const noteStr = note ? `  (${note})` : '';

    this._line(
      `    ${C.white}${dotted}${C.reset}  ${C.bold}${C.yellow}${valStr}${C.reset}${noteStr ? C.dim + noteStr + C.reset : ''}`,
      `    ${strip(dotted)}  ${valStr}${noteStr}`
    );
  }

  // ── ASCII bar chart ──────────────────────────────────────────────────

  bar(label, value, max, barWidth = 28) {
    const pct    = max > 0 ? value / max : 0;
    const filled = Math.min(barWidth, Math.max(0, Math.round(pct * barWidth)));
    const empty  = Math.max(0, barWidth - filled);
    const b      = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
    const pctStr = (pct * 100).toFixed(1).padStart(5);

    this._line(
      `    ${C.white}${pad(label, 22)}${C.reset}  ${C.cyan}${b}${C.reset}  ${C.bold}${pctStr}%${C.reset}  ${C.dim}(${typeof value === 'number' ? value.toFixed(2) : value})${C.reset}`,
      `    ${pad(label, 22)}  ${b}  ${pctStr}%  (${typeof value === 'number' ? value.toFixed(2) : value})`
    );
  }

  // ── table ────────────────────────────────────────────────────────────

  table(headers, rows) {
    const all    = [headers, ...rows];
    const widths = headers.map((_, i) =>
      Math.max(...all.map(r => String(r[i] ?? '').length))
    );

    const hline = (l, m, r) =>
      l + widths.map(w => '─'.repeat(w + 2)).join(m) + r;

    const row = (cells, colour) => {
      const inner = cells.map((c, i) =>
        ' ' + String(c ?? '').padEnd(widths[i]) + ' '
      ).join('│');
      this._line(
        `    ${colour}│${inner}│${C.reset}`,
        `    │${inner}│`
      );
    };

    this._line(`    ${C.dim}${hline('┌', '┬', '┐')}${C.reset}`, `    ${hline('┌', '┬', '┐')}`);
    row(headers, C.bold + C.cyan);
    this._line(`    ${C.dim}${hline('├', '┼', '┤')}${C.reset}`, `    ${hline('├', '┼', '┤')}`);
    rows.forEach((r, i) => row(r, i % 2 === 0 ? C.white : C.dim));
    this._line(`    ${C.dim}${hline('└', '┴', '┘')}${C.reset}`, `    ${hline('└', '┴', '┘')}`);
  }

  // ── summary card ─────────────────────────────────────────────────────

  summary(title, items) {
    this.blank();
    this._line(
      `  ${C.bold}${C.magenta}▶ ${title}${C.reset}`,
      `  ▶ ${title}`
    );
    items.forEach(({ label, value, status }) => {
      const icon  = { pass: `${C.green}✔${C.reset}`, fail: `${C.red}✘${C.reset}`, warn: `${C.yellow}⚠${C.reset}` }[status] ?? `${C.blue}•${C.reset}`;
      const pIcon = { pass: '✔', fail: '✘', warn: '⚠' }[status] ?? '•';
      this._line(
        `      ${icon}  ${pad(label, 40)}${C.bold}${value}${C.reset}`,
        `      ${pIcon}  ${pad(label, 40)}${value}`
      );
    });
  }

  // ── closing footer ───────────────────────────────────────────────────

  close() {
    this.blank();
    const msg = `Log saved → ${this.logPath}`;
    this._line(
      `  ${C.dim}${msg}${C.reset}\n`,
      `  ${msg}\n`
    );
    this.stream.end();
  }
}

module.exports = { Logger };
