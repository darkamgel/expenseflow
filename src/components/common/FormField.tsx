import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const baseFieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900';

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, required, hint, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function InputField({ label, error, hint, id, className = '', ...rest }: InputFieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} required={rest.required} hint={hint}>
      <input
        id={fieldId}
        className={`${baseFieldClasses} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function SelectField({ label, error, hint, id, className = '', children, ...rest }: SelectFieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} required={rest.required} hint={hint}>
      <select
        id={fieldId}
        className={`${baseFieldClasses} ${error ? 'border-red-400' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, error, hint, id, className = '', ...rest }: TextAreaFieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} required={rest.required} hint={hint}>
      <textarea
        id={fieldId}
        className={`${baseFieldClasses} min-h-[80px] resize-y ${error ? 'border-red-400' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </FieldWrapper>
  );
}

interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export function CheckboxField({ label, description, id, className = '', ...rest }: CheckboxFieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={fieldId} className="flex cursor-pointer items-start gap-3 py-1">
      <input
        id={fieldId}
        type="checkbox"
        className={`mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 ${className}`}
        {...rest}
      />
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
    </label>
  );
}
