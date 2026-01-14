/**
 * ProgressBar - Bootstrap/Loading Progress Display
 */
import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: string;
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  showLabel = true,
  color = 'bg-[#88CED0]',
  className = '',
  animated = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const getProgressColor = () => {
    if (color !== 'bg-[#88CED0]') return color;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-[#88CED0]';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${getProgressColor()} ${sizeClasses[size]} rounded-full transition-all duration-500 ${animated && percentage < 100 ? 'animate-pulse' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">Bootstrap</span>
          <span className="text-xs text-gray-300 font-mono">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

export const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number }> = ({
  value,
  size = 48,
  strokeWidth = 4,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-[#88CED0] transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-mono text-white">{Math.round(value)}%</span>
    </div>
  );
};

export default ProgressBar;
