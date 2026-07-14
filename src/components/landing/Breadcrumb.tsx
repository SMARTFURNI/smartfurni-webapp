import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  tone?: "dark" | "light";
}

export default function Breadcrumb({ items, tone = "dark" }: BreadcrumbProps) {
  const separatorClass = tone === "light" ? "text-[#28251F]/25" : "text-[#F5EDD6]/20";
  const currentClass = tone === "light" ? "text-[#28251F]/60" : "text-[#F5EDD6]/50";
  const linkClass = tone === "light"
    ? "text-[#28251F]/55 hover:text-[#8A6A1F]"
    : "text-[#F5EDD6]/40 hover:text-[#C9A84C]";

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`${separatorClass} flex-shrink-0`}>
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isLast || !item.href ? (
              <span className={isLast ? `${currentClass} truncate max-w-[200px]` : `${linkClass} transition-colors`}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className={`${linkClass} transition-colors whitespace-nowrap`}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
