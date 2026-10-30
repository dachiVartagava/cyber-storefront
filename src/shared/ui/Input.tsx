import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, rightElement, className = '', ...props }, ref) => {
    const inputClasses = [
      'ui-input',
      hasError ? 'ui-input--error' : '',
      rightElement ? 'ui-input--with-right-action' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="ui-input-wrapper">
        <input
          ref={ref}
          aria-invalid={hasError}
          className={inputClasses}
          {...props}
        />
        {rightElement}
      </div>
    );
  }
);

Input.displayName = 'Input';
