import { FC, ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  icon: ReactNode;
  actions?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, icon, actions }) => {
  return (
    <motion.div
      className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center">
        <div className="text-indigo-600 mr-3">{icon}</div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      {actions && <div className="flex space-x-2">{actions}</div>}
    </motion.div>
  );
};
