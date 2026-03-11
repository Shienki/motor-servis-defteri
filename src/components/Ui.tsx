import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Panel({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`rounded-[24px] bg-white p-5 shadow-panel ${className}`}>{children}</section>;
}

export function SectionTitle({
  eyebrow,
  title,
  titleClassName = "",
  eyebrowClassName = "",
  description
}: {
  eyebrow?: string;
  title: string;
  titleClassName?: string;
  eyebrowClassName?: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? <p className={`text-xs uppercase tracking-[0.22em] text-warning ${eyebrowClassName}`}>{eyebrow}</p> : null}
      <h2 className={`text-xl font-semibold text-ink ${titleClassName}`}>{title}</h2>
      {description ? <p className="text-sm text-steel">{description}</p> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm text-ink outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/20 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm text-ink outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/20 ${props.className ?? ""}`}
    />
  );
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variantClass =
    variant === "primary"
      ? "bg-amber text-ink hover:bg-amber/90"
      : variant === "secondary"
        ? "bg-ink text-white hover:bg-slate"
        : variant === "danger"
          ? "bg-danger text-white hover:bg-danger/90"
          : "bg-sand text-ink hover:bg-sand/80";

  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-ink">{children}</label>;
}
