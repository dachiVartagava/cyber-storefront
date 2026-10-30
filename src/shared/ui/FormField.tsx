import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  rightLabelElement?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  hint,
  required = false,
  rightLabelElement,
  children,
  className = '',
}) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={`ui-form-field ${className}`.trim()}>
      <div className="ui-form-field__label-row">
        <label htmlFor={id} className="ui-form-field__label">
          {label}
          {required && <span className="ui-form-field__required" aria-hidden="true">*</span>}
        </label>
        {rightLabelElement}
      </div>
      {children}
      {hint && !error && (
        <span id={hintId} className="ui-form-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="ui-form-field__error" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
};
