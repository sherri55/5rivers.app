import React, { useState, useRef } from "react";

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const handleMenuClick = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next && menuButtonRef.current) {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY,
          left: rect.right + window.scrollX - 156, // 176px = w-44
        });
      }
      return next;
    });
  };

  return (
    <header
      className="w-full py-4 px-6 flex items-center justify-between relative"
      style={{ position: "static", zIndex: 2 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl font-extrabold text-black tracking-wide drop-shadow-md">
          5 Rivers Trucking Inc.
        </span>
      </div>
      <div className="md:hidden">
        <button
          ref={menuButtonRef}
          aria-label="Open menu"
          className="focus:outline-none"
          onClick={handleMenuClick}
        >
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="black"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
      <nav className="hidden md:flex space-x-8">
        <a
          href="/"
          className="text-black hover:text-white font-semibold transition-colors duration-200"
        >
          Home
        </a>
        <a
          href="#services"
          className="text-black hover:text-white font-semibold transition-colors duration-200"
        >
          Services
        </a>
        <a
          href="#contact"
          className="text-black hover:text-white font-semibold transition-colors duration-200"
        >
          Contact
        </a>
        <a
          href="/login"
          className="text-black hover:text-white font-semibold transition-colors duration-200"
        >
          Login
        </a>
      </nav>
      {/* Mobile menu */}
      {menuOpen && menuPosition && (
        <div
          className="absolute md:hidden w-44 bg-black shadow-xl rounded-md flex flex-col z-50 border border-black animate-fade-in"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            marginTop: 8,
          }}
        >
          <a
            href="/"
            className="px-4 py-3 text-white hover:bg-gray-900 transition-colors"
          >
            Home
          </a>
          <a
            href="#services"
            className="px-4 py-3 text-white hover:bg-gray-900 transition-colors"
          >
            Services
          </a>
          <a
            href="#contact"
            className="px-4 py-3 text-white hover:bg-gray-900 transition-colors"
          >
            Contact
          </a>
        </div>
      )}
    </header>
  );
};

export default Header;
