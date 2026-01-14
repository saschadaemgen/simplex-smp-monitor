/**
 * LoadingSpinner - Loading States
 */
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  text 
}) => (
  <div className={`flex items-center justify-center gap-2 ${className}`}>
    <Loader2 size={sizeMap[size]} className="animate-spin text-[#88CED0]" />
    {text && <span className="text-gray-400">{text}</span>}
  </div>
);

export const LoadingOverlay: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50 rounded-lg">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={48} className="animate-spin text-[#88CED0]" />
      <span className="text-gray-300">{text}</span>
    </div>
  </div>
);

export const RefreshButton: React.FC<{ 
  onClick: () => void; 
  isLoading?: boolean;
  className?: string;
}> = ({ onClick, isLoading = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50 ${className}`}
  >
    <RefreshCw size={18} className={`text-[#88CED0] ${isLoading ? 'animate-spin' : ''}`} />
  </button>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-800 rounded-lg p-4 ${className}`}>
    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3" />
    <div className="h-3 bg-gray-700 rounded w-1/2 mb-2" />
    <div className="h-3 bg-gray-700 rounded w-2/3" />
  </div>
);

export default LoadingSpinner;
