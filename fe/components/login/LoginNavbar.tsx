import { useRouter } from "next/navigation";
import { BrandIcon } from "../ui/BrandIcon";

export function LoginNavbar() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push("/");
  };

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-[var(--color-border)] sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <BrandIcon />
            <span className="text-xl font-bold text-gray-900">Bone Vision Assistant</span>
          </button>
        </div>
      </div>
    </nav>
  );
}