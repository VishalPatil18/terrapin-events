/**
 * Alert Component
 * Display contextual feedback messages
 */

import { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ variant = 'info', title, children, onClose }: AlertProps) {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: Info,
      iconColor: 'text-blue-500',
      title: 'text-blue-800',
      text: 'text-blue-700',
    },
    success: {
      container: 'bg-green-50 border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      title: 'text-green-800',
      text: 'text-green-700',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: AlertCircle,
      iconColor: 'text-yellow-500',
      title: 'text-yellow-800',
      text: 'text-yellow-700',
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: XCircle,
      iconColor: 'text-red-500',
      title: 'text-red-800',
      text: 'text-red-700',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg p-4 ${config.container}`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.title} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.text}`}>{children}</div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={`ml-3 flex-shrink-0 ${config.iconColor} hover:opacity-70`}
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
