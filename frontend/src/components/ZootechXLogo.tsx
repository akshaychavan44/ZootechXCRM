import React from "react";

export interface ZootechXLogoProps {
  variant?: "full" | "compact" | "mark" | "watermark";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  dark?: boolean;
  subtitle?: string;
  className?: string;
  accentGlow?: boolean;
}

export const ZootechXMark: React.FC<{
  sizePx: number;
  dark?: boolean;
  accentGlow?: boolean;
  className?: string;
}> = ({ sizePx, dark = true, accentGlow = true, className = "" }) => {
  const gradientId = React.useId();

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: sizePx, height: sizePx }}
    >
      {accentGlow && (
        <div
          className={`absolute inset-0 rounded-2xl blur-md opacity-40 transition-opacity duration-300 pointer-events-none ${
            dark
              ? "bg-gradient-to-tr from-white/20 via-zinc-400/20 to-transparent"
              : "bg-gradient-to-tr from-zinc-800/25 via-zinc-900/15 to-transparent"
          }`}
          style={{ transform: "scale(1.15)" }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 transition-transform duration-200 hover:scale-[1.03]"
      >
        <defs>
          {/* Dark luxury linear gradients */}
          <linearGradient id={`${gradientId}-bg`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            {dark ? (
              <>
                <stop offset="0%" stopColor="#1e1e24" />
                <stop offset="50%" stopColor="#0c0c0e" />
                <stop offset="100%" stopColor="#000000" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#18181b" />
                <stop offset="50%" stopColor="#09090b" />
                <stop offset="100%" stopColor="#000000" />
              </>
            )}
          </linearGradient>

          <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            {dark ? (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#71717a" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#27272a" stopOpacity="0.6" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#52525b" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#27272a" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
              </>
            )}
          </linearGradient>

          <linearGradient id={`${gradientId}-z`} x1="20" y1="24" x2="80" y2="76" gradientUnits="userSpaceOnUse">
            {dark ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#e4e4e7" />
                <stop offset="100%" stopColor="#a1a1aa" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#f4f4f5" />
                <stop offset="100%" stopColor="#d4d4d8" />
              </>
            )}
          </linearGradient>

          <linearGradient id={`${gradientId}-x`} x1="25" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* Squircle container background */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="26"
          fill={`url(#${gradientId}-bg)`}
          stroke={`url(#${gradientId}-stroke)`}
          strokeWidth="3"
        />

        {/* Stylized Architectural Z and X geometric intersection */}
        {/* Upper horizontal bar of Z */}
        <path
          d="M 27 30 L 73 30 L 73 38 L 41 38 Z"
          fill={`url(#${gradientId}-z)`}
        />

        {/* Dynamic diagonal beam of Z and X nexus */}
        <path
          d="M 69 36 L 75 42 L 35 74 L 27 74 L 62 43 Z"
          fill={`url(#${gradientId}-z)`}
          fillOpacity="0.95"
        />

        {/* Lower horizontal bar of Z */}
        <path
          d="M 27 64 L 59 64 L 73 74 L 27 74 Z"
          fill={`url(#${gradientId}-z)`}
        />

        {/* Overlapping angular modern 'X' facet with cyber gradient */}
        <path
          d="M 33 34 L 43 28 L 69 66 L 59 72 Z"
          fill={`url(#${gradientId}-x)`}
          fillOpacity="0.85"
        />

        {/* Micro tech accent dot */}
        <circle cx="73" cy="28" r="3.5" fill="#38bdf8" />
      </svg>
    </div>
  );
};

export const ZootechXLogo: React.FC<ZootechXLogoProps> = ({
  variant = "compact",
  size = "md",
  dark = true,
  subtitle,
  className = "",
  accentGlow = true,
}) => {
  const sizeMap = {
    xs: { mark: 20, box: 24, text: "text-[13px]", sub: "text-[8.5px]", rounded: "rounded-md" },
    sm: { mark: 24, box: 28, text: "text-[14px]", sub: "text-[9px]", rounded: "rounded-lg" },
    md: { mark: 28, box: 32, text: "text-[14.5px]", sub: "text-[9.5px]", rounded: "rounded-lg" },
    lg: { mark: 36, box: 40, text: "text-base", sub: "text-[10px]", rounded: "rounded-xl" },
    xl: { mark: 48, box: 50, text: "text-xl", sub: "text-xs", rounded: "rounded-xl" },
  };

  const cfg = sizeMap[size];

  if (variant === "mark") {
    return (
      <ZootechXMark
        sizePx={cfg.mark}
        dark={dark}
        accentGlow={accentGlow}
        className={className}
      />
    );
  }

  if (variant === "watermark") {
    return (
      <div className={`opacity-5 pointer-events-none select-none flex items-center gap-4 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-white text-black font-black text-2xl flex items-center justify-center tracking-tighter">
          ZX
        </div>
        <div className="font-extrabold tracking-tighter text-4xl uppercase">
          Zootech<span className="text-zinc-400">X</span>
        </div>
      </div>
    );
  }

  // Exact reference design: Rounded white/dark badge with bold "ZX" + ZootechX title + subtitle
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Sleek ZX Badge */}
      <div
        className={`${cfg.rounded} font-black flex items-center justify-center tracking-tighter shrink-0 shadow-2xs transition-transform hover:scale-105 ${
          dark
            ? "bg-white text-black"
            : "bg-slate-900 text-white"
        }`}
        style={{ width: cfg.box, height: cfg.box, fontSize: Math.max(11, Math.round(cfg.box * 0.44)) }}
      >
        ZX
      </div>

      <div className="flex flex-col min-w-0 leading-none">
        <div
          className={`font-bold tracking-tight ${cfg.text} ${
            dark ? "text-white" : "text-slate-900"
          }`}
        >
          Zootech<span className={dark ? "text-white" : "text-slate-900"}>X</span>
        </div>

        <div
          className={`uppercase tracking-[0.14em] font-semibold ${cfg.sub} mt-1 ${
            dark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {subtitle || "ERP PLATFORM"}
        </div>
      </div>
    </div>
  );
};

export default ZootechXLogo;
