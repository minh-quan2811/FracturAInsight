interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizes = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`animate-spin rounded-full border-2 ${sizes[size]}`}
        style={{
          borderColor: "var(--color-border-strong)",
          borderTopColor: "var(--color-primary-medium)",
        }}
      />
      {text && <p className="eyebrow mt-4">{text}</p>}
    </div>
  );
}