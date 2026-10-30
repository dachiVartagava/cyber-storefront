import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const icons = {
    error: <AlertCircle size={18} className="ui-alert__icon" aria-hidden="true" />,
    success: <CheckCircle2 size={18} className="ui-alert__icon" aria-hidden="true" />,
    warning: <AlertTriangle size={18} className="ui-alert__icon" aria-hidden="true" />,
    info: <Info size={18} className="ui-alert__icon" aria-hidden="true" />,
  };

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`ui-alert ui-alert--${variant} ${className}`.trim()}
    >
      {icons[variant]}
      <div className="ui-alert__content">
        {title && <div className="ui-alert__title">{title}</div>}
        <div>{children}</div>
        {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
      </div>
    </div>
  );
};
