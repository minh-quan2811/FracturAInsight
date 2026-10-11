"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeToken } from "@/utils/jwt";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function TeacherPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = decodeToken(token);
    if (!payload) {
      router.push("/login");
      return;
    }
    const isAdmin = payload.is_admin === true || payload.is_admin === "True" || payload.is_admin === "true";
    if (!isAdmin) {
      // not allowed
      router.push("/student");
      return;
    }
    setAuthorized(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <LoadingSpinner text="Checking access..." />
      </div>
    );
  }

  return (
    <div className="page-scroll bg-[var(--color-surface)]">
      <header className="nav">
        <div className="container-x flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandIcon className="w-8 h-8" />
            <span className="t-primary text-[15px] font-semibold tracking-tight">
              Bone Vision Assistant
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="container-x py-16">
        <p className="eyebrow eyebrow-accent">Teacher</p>
        <h1 className="display mt-4 text-4xl">Teacher dashboard.</h1>
        <p className="t-secondary mt-4 max-w-xl text-[15px] leading-relaxed">
          You&apos;re logged in as a teacher/admin.
        </p>
      </main>
    </div>
  );
}