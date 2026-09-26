import { INSTAGRAM_LABEL, INSTAGRAM_URL, INSTAGRAM_CTA } from "../data/social";
import "./InstagramLink.css";

/* The one Instagram link the site uses (owner addition 2026-09-26).
 *
 * A plain <a> to the confirmed profile, so it works without JS and can be
 * opened in a new tab from anywhere. The logo is drawn inline (no icon font, no
 * remote asset) and is decorative — the link itself carries the accessible
 * name, so a screen reader announces "CSEC Compass on Instagram, link" rather
 * than a stray graphic.
 *
 * The URL and every piece of copy come from src/data/social.js: nothing here
 * retypes the handle.
 */
export default function InstagramLink({ className = "", text = INSTAGRAM_CTA }) {
  return (
    <a
      className={`instagram-link${className ? ` ${className}` : ""}`}
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={INSTAGRAM_LABEL}
      title={INSTAGRAM_LABEL}
    >
      <svg
        className="instagram-link-icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
      </svg>
      <span className="instagram-link-text">{text}</span>
    </a>
  );
}
