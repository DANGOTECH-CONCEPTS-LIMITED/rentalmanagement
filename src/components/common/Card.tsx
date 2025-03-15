
import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  bgColor?: string;
  className?: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  value,
  icon,
  bgColor = 'bg-white',
  className,
  children,
}) => {
  return (
    <div 
      className={cn(
        "rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md",
        bgColor,
        className
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          {icon && <div className="text-xl">{icon}</div>}
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-semibold">{value}</p>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Card;
