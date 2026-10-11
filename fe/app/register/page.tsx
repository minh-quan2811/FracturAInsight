"use client";
import { LoginNavbar } from "@/components/login/LoginNavbar";
import { RegisterHeader } from "@/components/register/RegisterHeader";
import { RegisterForm } from "@/components/register/RegisterForm";
import { useRegisterForm } from "@/hooks/register/useRegisterForm";

export default function RegisterPage() {
  const {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    togglePasswordVisibility,
    showConfirmPassword,
    toggleConfirmPasswordVisibility,
    error,
    loading,
    handleSubmit,
  } = useRegisterForm();

  return (
    <div data-theme="dark" className="page-scroll">
      <LoginNavbar />
      <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative w-full max-w-md py-8">
          <RegisterHeader />
          <RegisterForm
            username={username}
            setUsername={setUsername}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            togglePasswordVisibility={togglePasswordVisibility}
            showConfirmPassword={showConfirmPassword}
            toggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}