#!/usr/bin/env sh
# tools/check-all.sh — the suite runner. THE way to run every harness.
#
# Why this file exists: the documented runner used to be
#   for f in tools/check-*.mjs; do node "$f"; done
# and a shell loop returns the exit status of its LAST command. A harness could fail in the middle and the
# loop still exited 0, so "the suite is green" meant nothing — however many red controls each harness ran.
# Running controls by default enforces nothing while the runner discards the status.
#
# This runner keeps the same discovery rule — every `tools/check-*.mjs` joins automatically, there is no
# registry to forget — and makes the exit status mean "every harness passed":
#   * one line per harness: `ok <name>` or `FAIL <name>`;
#   * a failing harness's own last lines are printed under it, so the red is readable;
#   * a harness that exits 0 but prints NOTHING is counted RED: a harness that cannot report is not a pass,
#     and it must never look like a skip;
#   * the last line is `suite: N harnesses, M red`;
#   * the exit code is 0 only when M is 0 and at least one harness was found.
#
# No arguments are passed to the harnesses, deliberately: every harness runs its real check AND its red
# controls on a bare invocation, so this script runs both halves of every guard.
#
# Usage: sh tools/check-all.sh        (or: npm test)
set -u

cd "$(dirname "$0")/.." || exit 1

total=0
red=0
red_names=""

for f in tools/check-*.mjs; do
  if [ ! -f "$f" ]; then
    printf 'suite: no harnesses matched tools/check-*.mjs\n'
    exit 1
  fi
  total=$((total + 1))
  name=${f#tools/}
  out=$(mktemp "${TMPDIR:-/tmp}/check-all.XXXXXX") || { printf 'suite: cannot create a temp file\n'; exit 1; }
  node "$f" >"$out" 2>&1
  rc=$?
  if [ "$rc" -eq 0 ] && [ ! -s "$out" ]; then
    red=$((red + 1))
    red_names="$red_names $name"
    printf 'FAIL %s (exit 0 but printed nothing — a harness that reports nothing cannot pass)\n' "$name"
  elif [ "$rc" -ne 0 ]; then
    red=$((red + 1))
    red_names="$red_names $name"
    printf 'FAIL %s (exit %d)\n' "$name" "$rc"
    tail -n 20 "$out" | sed 's/^/     /'
  else
    printf 'ok   %s\n' "$name"
  fi
  rm -f "$out"
done

printf '\nsuite: %d harnesses, %d red\n' "$total" "$red"
if [ "$red" -ne 0 ]; then
  printf 'red:%s\n' "$red_names"
  exit 1
fi
exit 0
