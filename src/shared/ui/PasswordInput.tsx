import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, type InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightElement'> {
  showLabel?: string;
  hideLabel?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showLabel, hideLabel, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const { t } = useTranslation();

    const toggleLabel = visible
      ? hideLabel || t('auth.password.hide')
      : showLabel || t('auth.password.show');

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        rightElement={
          <button
            type="button"
            className="ui-input__toggle"
            onClick={() => setVisible((prev) => !prev)}
            disabled={disabled}
            aria-label={toggleLabel}
            title={toggleLabel}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
