// Social links — written down ONCE (owner addition 2026-09-26).
//
// The handle is confirmed: @csec_compass. The homepage and the site-wide footer
// both render <InstagramLink>, which reads these constants, so the two can never
// disagree and a handle change is a one-line edit here.
//
// The URL is NOT retyped anywhere else in src/: tools/check-instagram-link.mjs
// fails if any other file spells out an instagram.com address, which is what
// keeps this file the single source of truth.
export const INSTAGRAM_HANDLE = "csec_compass";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
// The link's accessible name (used as aria-label, so an icon-only rendering is
// still announced properly).
export const INSTAGRAM_LABEL = "CSEC Compass on Instagram";
// Visible copy next to the logo, one per surface: the homepage can afford the
// sentence, the footer row wants just the handle.
export const INSTAGRAM_CTA = `Follow @${INSTAGRAM_HANDLE} on Instagram`;
export const INSTAGRAM_SHORT_CTA = `@${INSTAGRAM_HANDLE}`;
