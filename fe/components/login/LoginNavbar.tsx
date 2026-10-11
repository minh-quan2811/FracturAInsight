import { useRouter } from "next/navigation";
import { BrandIcon } from "../ui/BrandIcon";

export function LoginNavbar() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push("/");
  };

  return (
    <nav className="nav">
      <div className="container-x flex h-16 items-center">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <BrandIcon className="w-8 h-8" />
          <span className="t-primary text-[15px] font-semibold tracking-tight">
            Bone Vision Assistant
          </span>
        </button>
      </div>
    </nav>
  );
}