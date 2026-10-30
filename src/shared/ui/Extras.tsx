import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius,
  className = '',
  style,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`ui-skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export interface BadgeProps {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  return <span className={`ui-badge ui-badge--${variant} ${className}`.trim()}>{children}</span>;
};

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (newQty: number) => void;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 1,
  max = 99,
  disabled = false,
  onChange,
}) => {
  const { t } = useTranslation();
  const effectiveMax = Math.min(max, 99);

  return (
    <div className="ui-stepper" role="group" aria-label={t('cart.quantity')}>
      <button
        type="button"
        className="ui-stepper__btn"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={t('cart.decreaseQty')}
      >
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className="ui-stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="ui-stepper__btn"
        disabled={disabled || value >= effectiveMax}
        onClick={() => onChange(value + 1)}
        aria-label={t('cart.increaseQty')}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
};
