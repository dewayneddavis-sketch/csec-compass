// The /account tab list and its keyboard map — the pure part of the tab bar, kept
// in a plain .js module (like the other data modules) so a Node harness can import
// and test it directly; src/components/AccountTabs.jsx only renders what is here.
//
// ACCOUNT_TABS is the single list of tabs: adding one is a change in this file.
export const ACCOUNT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "messages", label: "Messages" },
];

// Which tab a key press moves to, or null when the key is not ours to handle.
//
// This exists because the tab bar uses a roving tabIndex (0 on the selected tab,
// -1 on the rest, the WAI-ARIA Tabs pattern). Without arrow-key handling, Tab
// would reach only the SELECTED tab and a keyboard user could never switch tabs —
// so the keys are not a nicety here, they are what keeps the bar usable without a
// mouse. Left/Right wrap around; Home/End jump to the ends; everything else
// (Tab, Enter, Escape, letters being typed) is left to the browser.
export function nextTabId(active, key) {
  const index = ACCOUNT_TABS.findIndex((tab) => tab.id === active);
  if (index === -1) return null;
  if (key === "ArrowRight") return ACCOUNT_TABS[(index + 1) % ACCOUNT_TABS.length].id;
  if (key === "ArrowLeft") return ACCOUNT_TABS[(index - 1 + ACCOUNT_TABS.length) % ACCOUNT_TABS.length].id;
  if (key === "Home") return ACCOUNT_TABS[0].id;
  if (key === "End") return ACCOUNT_TABS[ACCOUNT_TABS.length - 1].id;
  return null;
}
