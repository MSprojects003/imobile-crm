import Image from "next/image"
import Link from "next/link"

export function BrandPanel() {
  return (
    <section className="relative flex min-h-[340px] flex-col overflow-hidden bg-gradient-to-br from-[#f2222f] via-[#ea1c2b] to-[#d3121f] text-white lg:min-h-full">
      {/* Soft background circles */}
      <div className="pointer-events-none absolute -right-28 top-[42%] size-72 rounded-full bg-white/[0.06] sm:size-96 lg:-right-40 lg:size-[34rem]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-black/[0.06]" />

      {/* White curved shape + logo */}
      <div className="relative h-[132px] w-full sm:h-[150px] lg:h-[160px]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 380 180"
        >
          {/* Extends past the top/right edges so no edge line shows on the right */}
          <path
            d="M98 -4 H400 V176 H150 C100 176 66 164 74 124 C80 92 91 44 98 -4 Z"
            fill="#ffffff"
          />
        </svg>

        <div className="absolute inset-y-0 right-0 z-10 flex w-[66%] items-center justify-center px-4 sm:px-7">
          <Link aria-label="iMobile Supreme home" className="flex items-center" href="/">
            <Image
              alt="iMobile Supreme"
              className="h-auto w-[min(100%,210px)] object-contain sm:w-[235px]"
              height={116}
              priority
              src="/imobile.webp"
              width={370}
            />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-7 lg:px-10 lg:pb-10">
        <div className="max-w-sm">
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] sm:text-[1.7rem]">
            Welcome Back
          </h2>
          <p className="mt-0 text-sm text-white/65 sm:text-base">
            Sign in to your admin account
          </p>
        </div>

        {/* Devices illustration */}
        <div className="relative mx-auto mt-5 flex h-32 w-full max-w-[240px] items-center justify-center gap-1 sm:mt-6 sm:h-40 lg:mt-8 lg:h-44">
          {/* Base glow */}
          <div className="absolute bottom-0 left-1/2 h-3 w-44 -translate-x-1/2 rounded-[50%] bg-[#7d000c]/40 blur-md sm:w-52" />
          <div className="absolute bottom-1 left-1/2 h-2 w-36 -translate-x-1/2 rounded-[50%] bg-black/20 sm:w-44" />

          {/* Small phone (left) */}
          <div className="relative z-10 mb-1 h-16 w-9 rounded-[9px] border-2 border-white/70 bg-gradient-to-b from-white/25 to-white/5 shadow-[0_12px_28px_rgba(125,0,12,0.3)] sm:h-20 sm:w-12">
            <span className="absolute left-1/2 top-1.5 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white/70" />
          </div>

          {/* Main phone (center) */}
          <div className="relative z-20 h-28 w-[68px] rounded-[11px] border-2 border-white/80 bg-gradient-to-b from-white/30 to-white/5 shadow-[0_16px_34px_rgba(125,0,12,0.35)] sm:h-32 sm:w-20">
            <span className="absolute left-1/2 top-2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/70" />
            <span className="absolute left-1/2 top-1/2 h-9 w-11 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white/95 shadow-md">
              <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-[#ed1c2e]/50" />
              <span className="absolute inset-x-2 top-4 h-1 rounded-full bg-[#ed1c2e]/30" />
            </span>
            <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white/70" />
          </div>

          {/* Tablet (right, tilted) */}
          <div className="relative z-10 mb-1 h-20 w-14 -skew-x-6 rounded-[9px] border-2 border-white/60 bg-gradient-to-b from-white/20 to-white/5 shadow-[0_14px_30px_rgba(125,0,12,0.3)] sm:h-24 sm:w-16" />
        </div>
      </div>
    </section>
  )
}