/**
 * PublicFooter — small dark footer shown below the contact chapter.
 * Single line of mono copyright text on a near-black band.
 */

export function PublicFooter() {
  return (
    <footer className="bg-[var(--color-public-on-surface)] text-white py-12 px-8 text-center">
      <p className="public-label-mono text-xs tracking-widest opacity-70">
        © {new Date().getFullYear()} 5RIVERS TRUCKING INC. — LONDON, ON
      </p>
    </footer>
  );
}
