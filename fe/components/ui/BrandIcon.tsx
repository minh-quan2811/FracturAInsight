import Image from "next/image";

interface BrandIconProps {
  className?: string;
}

export function BrandIcon({ className = "w-10 h-10" }: BrandIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex overflow-hidden rounded-xl bg-white ${className}`}
    >
      <Image
        src="/icon.jpg"
        alt=""
        fill
        sizes="80px"
        className="object-cover object-top"
      />
    </span>
  );
}
