type PageHeadingProps = {
  title: string
  description: string
  hideTitle?: boolean
}

export function PageHeading({
  title,
  description,
  hideTitle = false,
}: PageHeadingProps) {
  return (
    <header className=" md:hidden -md:space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        iMobile workspace
      </p>
      {!hideTitle && (
        <h1 className="text-xl md:hidden  font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
      )}
      <p className="max-w-2xl  text-[13px] leading-5 text-slate-500">
        {description}
      </p>
    </header>
  )
}
