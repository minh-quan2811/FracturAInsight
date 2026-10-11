interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "email" | "password";
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  error,
  className = "",
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}{" "}
          {required && <span style={{ color: "var(--color-error)" }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`field ${error ? "field-error" : ""} ${className}`}
      />
      {error && (
        <p className="mt-1.5 text-sm" style={{ color: "var(--color-error-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}