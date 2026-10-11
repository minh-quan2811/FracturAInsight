"use client";
import { Suspense } from "react";
import { LoginNavbar } from "@/components/login/LoginNavbar";
import { LoginHeader } from "@/components/login/LoginHeader";
import { LoginForm } from "@/components/login/LoginForm";
import { useLoginForm } from "@/hooks/login/useLoginForm";

function LoginContent() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    togglePasswordVisibility,
    error,
    successMessage,
    loading,
    handleSubmit,
  } = useLoginForm();

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <div className="hero-glow" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <LoginHeader />
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          togglePasswordVisibility={togglePasswordVisibility}
          error={error}
          successMessage={successMessage}
          loading={loading}
          onSubmit={handleSubmit}
        />
        <p className="t-tertiary mt-6 text-center text-xs">
          Secure medical assistant platform for bone fracture diagnosis
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div data-theme="dark" className="page-scroll">
      <LoginNavbar />
      <Suspense
        fallback={
          <div className="t-tertiary flex min-h-[calc(100vh-64px)] items-center justify-center text-sm">
            Loading...
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}