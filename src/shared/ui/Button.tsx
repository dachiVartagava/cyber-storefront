import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classes = [
      'ui-btn',
      `ui-btn--${variant}`,
      `ui-btn--${size}`,
      fullWidth ? 'ui-btn--full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={classes}
        {...props}
      >
        <span className={`ui-btn__content ${isLoading ? 'ui-btn__content--hidden' : ''}`}>
          {leftIcon}
          {children}
          {rightIcon}
        </span>
        {isLoading && (
          <span className="ui-btn__spinner" aria-hidden="true">
            <Loader2 className="ui-spinner-icon" size={size === 'sm' ? 16 : 20} />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
