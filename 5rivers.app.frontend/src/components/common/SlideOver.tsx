import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger animation after render
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 slide-over-backdrop transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-6 lg:pl-8">
        <div 
          className={`pointer-events-auto w-screen ${sizeClasses[size]} transform transition-transform duration-300 ease-in-out ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col bg-white slide-over-panel">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-6 sm:px-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-xl font-semibold text-slate-900 truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{subtitle}</p>
                  )}
                </div>
                <div className="flex h-7 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full p-0 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close panel</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto slide-over-content">
              <div className="px-4 py-6 sm:px-6">
                <div className="max-w-full">
                  {children}
                </div>
              </div>
            </div>

            {/* Optional footer/actions area - forms can add their own buttons */}
            <div className="flex-shrink-0">
              {/* This space can be used by forms for their action buttons */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideOver;
