import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      placeholder,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      disabled = false,
      required = false,
      error,
      icon: Icon,
      iconPosition = 'left',
      className = '',
      id,
      name,
      autoComplete,
      ariaLabel,
      ariaDescribedBy,
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const inputId = id || name;
    const errorId = hasError ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ');

    const containerClasses = [
      'input-container',
      hasError && 'input-container-error',
      disabled && 'input-container-disabled',
      Icon && 'input-container-with-icon',
      Icon && `input-container-icon-${iconPosition}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        {Icon && iconPosition === 'left' && (
          <Icon size={16} className="input-icon input-icon-left" aria-hidden="true" />
        )}
        <input
          ref={ref}
          type={type}
          id={inputId}
          name={name}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className="input-field"
          aria-label={ariaLabel}
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError}
        />
        {Icon && iconPosition === 'right' && (
          <Icon size={16} className="input-icon input-icon-right" aria-hidden="true" />
        )}
        {hasError && (
          <p id={errorId} className="input-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 