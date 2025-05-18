import React from "react";

const Footer: React.FC = () => (
  <footer
    className="w-full  text-white py-6 px-8 mt-auto z-2 relative"
    style={{ position: "static", zIndex: 2 }}
  >
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <span className="font-semibold">
        &copy; {new Date().getFullYear()}, 5 Rivers Trucking Inc. All rights
        reserved.
      </span>
      <span>
        London, Ontario &amp; Nearby Areas |{" "}
        <a
          href="mailto:info@5riverstruckinginc.ca"
          className="underline hover:text-blue-200"
        >
          info@5riverstruckinginc.ca
        </a>
      </span>
    </div>
  </footer>
);

export default Footer;
