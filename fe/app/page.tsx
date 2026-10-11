import Link from "next/link";
import { BrandIcon } from "@/components/ui/BrandIcon";

const FEATURES = [
  {
    n: "01",
    title: "AI-Powered Analysis",
    body: "Upload X-ray images and receive instant AI-assisted fracture detection and analysis using advanced computer vision",
  },
  {
    n: "02",
    title: "Interactive Chat",
    body: "Ask questions about bone fractures, treatments, and recovery. Get detailed explanations from our medical AI assistant",
  },
  {
    n: "03",
    title: "Educational Platform",
    body: "Perfect for medical students and professionals to learn about fracture diagnosis with AI-assisted guidance",
  },
];

const STEPS = [
  { n: "01", title: "Upload", body: "Add an X-ray image to your workspace." },
  { n: "02", title: "Review", body: "See the AI-assisted detection on the image." },
  { n: "03", title: "Ask", body: "Chat about the findings, treatments, and recovery." },
];

export default function Home() {
  return (
    <div data-theme="dark" className="page-scroll">
      {/* Navigation */}
      <header className="nav">
        <div className="container-x flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandIcon className="w-8 h-8" />
            <span className="t-primary text-[15px] font-semibold tracking-tight">
              Bone Vision Assistant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-outline btn-sm">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-solid btn-sm">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 01 / Hero */}
        <section className="relative">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-glow" aria-hidden="true" />
          <div className="container-x relative pt-24 pb-28 sm:pt-32 sm:pb-36">
            <p className="eyebrow eyebrow-accent">01 / Bone Vision Assistant</p>
            <h1 className="display mt-6 max-w-3xl text-5xl sm:text-7xl">
              See the fracture. Understand it.
            </h1>
            <p className="lead mt-7 max-w-2xl">
              Advanced AI-powered platform for bone fracture detection, diagnosis
              assistance, and medical education.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-solid btn-lg">
                Get started
              </Link>
              <Link href="/register" className="btn btn-outline btn-lg">
                Create account
              </Link>
            </div>
          </div>
        </section>

        {/* 02 / What it does */}
        <section className="hairline-t">
          <div className="container-x py-24">
            <p className="eyebrow">02 / What it does</p>
            <h2 className="heading mt-4 max-w-xl text-3xl sm:text-4xl">
              Three tools. One workspace.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.n} className="card card-interactive p-7">
                  <p className="eyebrow eyebrow-accent">{f.n}</p>
                  <h3 className="t-primary mt-5 text-lg font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="t-secondary mt-3 text-[15px] leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03 / How it works */}
        <section className="hairline-t">
          <div className="container-x py-24">
            <p className="eyebrow">03 / How it works</p>
            <h2 className="heading mt-4 max-w-xl text-3xl sm:text-4xl">
              Three steps. No setup.
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="hairline-t pt-6">
                  <p className="eyebrow eyebrow-accent">{s.n}</p>
                  <h3 className="t-primary mt-4 text-lg font-semibold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="t-secondary mt-2 text-[15px] leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Call to action */}
        <section className="hairline-t">
          <div className="container-x py-24">
            <div className="card flex flex-col items-start justify-between gap-8 p-10 md:flex-row md:items-center">
              <div>
                <p className="eyebrow eyebrow-accent">Free to join</p>
                <h2 className="heading mt-3 text-3xl">Ready when you are.</h2>
                <p className="t-secondary mt-3 max-w-md text-[15px] leading-relaxed">
                  Sign in to start a conversation and upload your first image.
                </p>
              </div>
              <Link href="/login" className="btn btn-solid btn-lg">
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hairline-t">
        <div className="container-x flex flex-col gap-2 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-tertiary text-sm">Bone Vision Assistant</p>
          <p className="t-tertiary text-xs">
            For learning and decision support. Always confirm findings with a qualified clinician.
          </p>
        </div>
      </footer>
    </div>
  );
}