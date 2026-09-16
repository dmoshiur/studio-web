import * as React from "react";

/** Studio page heading — serif title, tracked eyebrow, gold hairline. */
export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-9 flex flex-col gap-5 border-b border-white/[0.07] pb-7 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-3 font-sans text-[9.5px] font-semibold uppercase tracking-[0.26em] text-gold-400">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-[2rem] leading-tight text-ivory-50 md:text-[2.35rem]">{title}</h1>
        {description && <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-ivory-400/80">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-3">{action}</div>}
    </div>
  );
}
