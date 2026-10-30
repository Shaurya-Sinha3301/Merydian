import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, hint, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-bold text-magenta-ink">
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  'w-full rounded-sm bg-paper border border-ink px-3 text-base text-ink focus-visible:outline-offset-0 focus-visible:border-cyan';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  id: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, id, ...rest }, ref) {
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <input ref={ref} id={id} aria-invalid={!!error} className={`${control} h-11`} {...rest} />
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  id: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, id, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <textarea ref={ref} id={id} aria-invalid={!!error} className={`${control} py-2.5 leading-snug`} {...rest} />
    </FieldShell>
  );
});
