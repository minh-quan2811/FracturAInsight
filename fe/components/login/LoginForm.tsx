import Link from "next/link";

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  error: string | null;
  successMessage: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  togglePasswordVisibility,
  error,
  successMessage,
  loading,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="card p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field pr-16"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="field-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {successMessage && <div className="notice notice-success">{successMessage}</div>}

        {error && <div className="notice notice-error">{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-solid btn-lg w-full">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="t-secondary text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="t-accent font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}