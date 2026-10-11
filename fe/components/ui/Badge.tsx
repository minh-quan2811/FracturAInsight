interface BadgeProps {
  children: React.ReactNode;
  variant?: "student" | "teacher" | "assistant" | "default";
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  const variants = {
    student: "pill-accent",
    teacher: "pill-accent",
    assistant: "",
    default: "",
  };

  const sizes = {
    sm: "",
    md: "!text-xs !px-3 !py-1",
  };

  return (
    <span className={`pill ${variants[variant]} ${sizes[size]}`}>{children}</span>
  );
}