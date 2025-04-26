import { FC, ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
  className?: string;
}

export const CollapsiblePanel: FC<CollapsiblePanelProps> = ({
  title,
  children,
  initiallyOpen = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className={`bg-white rounded-lg shadow-md mb-6 ${className}`}>
      <button
        className="w-full flex items-center justify-between p-4 text-left font-medium focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg text-gray-900">{title}</span>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
