import fullInk from "../assets/logos/karwan-logo-full-ink.png";
import fullWhite from "../assets/logos/karwan-logo-full-white.png";
import iconInk from "../assets/logos/karwan-icon-ink.png";
import iconWhite from "../assets/logos/karwan-icon-white.png";

/**
 * Karwan logo.
 *  variant  "ink"   -> dark logo for light backgrounds (header, login, footer)
 *           "white" -> light logo for dark backgrounds (hero photo)
 *  height   rendered height in px
 *  iconOnly show only the icon + `text` beside it (used for Urdu, where the
 *           English wordmark would not match the translated name)
 */
export default function BrandLogo({ variant = "ink", height = 32, iconOnly = false, text = "", className = "" }) {
  const dark = variant === "ink";
  if (iconOnly) {
    return (
      <>
        <img src={dark ? iconInk : iconWhite} alt="" aria-hidden="true" className={`brandlogo ${className}`} style={{ height }} />
        {text}
      </>
    );
  }
  return <img src={dark ? fullInk : fullWhite} alt="Karwan" className={`brandlogo ${className}`} style={{ height }} />;
}
