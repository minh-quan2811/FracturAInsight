"use client";
import { useRouter } from "next/navigation";
import { BrandIcon } from "@/components/ui/BrandIcon";

export default function Home() {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[var(--color-primary-lightest)] via-white to-[var(--color-gray-50)] m-0 p-0">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <BrandIcon />
              <span className="text-xl font-bold text-gray-900">Bone Vision Assistant</span>
            </div>
            <button
              onClick={handleGoToLogin}
              className="px-6 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-medium)] text-white font-semibold rounded-lg hover:from-[var(--color-primary-hover)] hover:to-[var(--color-primary-dark)] transition-all shadow-md hover:shadow-lg"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Main Heading */}
          <div className="mb-8">
            <BrandIcon className="w-20 h-20 rounded-3xl mb-6 shadow-2xl" />
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-6">
              Bone Vision Assistant
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
              Advanced AI-powered platform for bone fracture detection, diagnosis assistance, and medical education
            </p>
            <button
              onClick={handleGoToLogin}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-medium)] text-white font-semibold text-lg rounded-xl hover:from-[var(--color-primary-hover)] hover:to-[var(--color-primary-dark)] transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
            >
              Get Started
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-[var(--color-border)] hover:shadow-xl hover:border-[var(--color-primary)] transition-all">
              <div className="w-14 h-14 bg-[var(--color-primary-lightest)] rounded-xl flex items-center justify-center mb-4 mx-auto">
                <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Analysis</h3>
              <p className="text-gray-600">
                Upload X-ray images and receive instant AI-assisted fracture detection and analysis using advanced computer vision
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-[var(--color-border)] hover:shadow-xl hover:border-[var(--color-primary-medium)] transition-all">
              <div className="w-14 h-14 bg-[var(--color-primary-lightest)] rounded-xl flex items-center justify-center mb-4 mx-auto">
                <svg className="w-7 h-7 text-[var(--color-primary-medium)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Interactive Chat</h3>
              <p className="text-gray-600">
                Ask questions about bone fractures, treatments, and recovery. Get detailed explanations from our medical AI assistant
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-[var(--color-border)] hover:shadow-xl hover:border-[var(--color-primary-light)] transition-all">
              <div className="w-14 h-14 bg-[var(--color-primary-lightest)] rounded-xl flex items-center justify-center mb-4 mx-auto">
                <svg className="w-7 h-7 text-[var(--color-primary-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Educational Platform</h3>
              <p className="text-gray-600">
                Perfect for medical students and professionals to learn about fracture diagnosis with AI-assisted guidance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}