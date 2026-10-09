import { BrandIcon } from "../ui/BrandIcon";

export function LoginHeader() {
  return (
    <div className="text-center mb-8">
      <BrandIcon className="w-16 h-16 rounded-2xl mb-4 shadow-lg" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
        Bone Vision Assistant
      </h1>
      <p className="text-[var(--color-text-secondary)]">
        Sign in to continue to your account
      </p>
    </div>
  );
}