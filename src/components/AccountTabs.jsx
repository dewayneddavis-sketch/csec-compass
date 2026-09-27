// The /account tab bar.
//
// WHY THIS EXISTS: the student↔teacher Messages panel (PR #102) shipped as a
// full-width card at the BOTTOM of the account grid, after Profile, Subscription,
// My Subjects and Family — and the owner reported students missing it. One tap
// from the top instead of a scroll to the bottom.
//
// WHAT IT IS: the WAI-ARIA Tabs pattern, done properly rather than styled badly.
//   * a real <button role="tab"> per tab (never a clickable <div>), so Enter and
//     Space work with no JavaScript of ours;
//   * aria-selected on each, and exactly one tab selected;
//   * aria-controls on every tab pointing at a panel that is ALWAYS in the DOM,
//     so the reference never dangles;
//   * a roving tabIndex (0 on the selected tab, -1 on the rest) PLUS arrow/Home/End
//     keys — without the keys, roving tabIndex would trap a keyboard user on the
//     selected tab with no way to reach the other one;
//   * inactive panels are hidden with the `hidden` attribute, not removed, which
//     is the APG's own advice and keeps a half-typed message alive while the
//     student peeks at Overview.
//
// The page owns WHICH tab is showing (it reads it from the URL, so
// /account?tab=messages opens Messages directly, survives a reload and can be
// linked); this file only draws the bar and the panels.
import { useRef } from "react";
import { ACCOUNT_TABS, nextTabId } from "../data/accountTabs.js";

export { ACCOUNT_TABS, nextTabId };

export function AccountTabBar({ active, onSelect }) {
  const buttons = useRef({});

  function onKeyDown(event) {
    const next = nextTabId(active, event.key);
    if (next === null) return;
    event.preventDefault();
    onSelect(next);
    // Automatic activation: the selection moves, so focus must follow it or the
    // keyboard user is left standing on a tab that is no longer selected.
    const button = buttons.current[next];
    if (button && typeof button.focus === "function") button.focus();
  }

  return (
    <div className="acct-tabs" role="tablist" aria-label="My account sections" onKeyDown={onKeyDown}>
      {ACCOUNT_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`acct-tab-${tab.id}`}
            ref={(node) => {
              buttons.current[tab.id] = node;
            }}
            className={"acct-tab" + (selected ? " is-active" : "")}
            aria-selected={selected}
            aria-controls={`acct-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AccountTabPanel({ id, active, children }) {
  return (
    <div
      className="acct-panel"
      role="tabpanel"
      id={`acct-panel-${id}`}
      aria-labelledby={`acct-tab-${id}`}
      tabIndex={0}
      hidden={!active}
    >
      {children}
    </div>
  );
}
