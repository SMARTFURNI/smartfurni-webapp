import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#F5EDD6]/20 flex-shrink-0">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isLast || !item.href ? (
              <span className={isLast ? "text-[#F5EDD6]/50 truncate max-w-[200px]" : "text-[#F5EDD6]/40 hover:text-[#C9A84C] transition-colors"}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[#F5EDD6]/40 hover:text-[#C9A84C] transition-colors whitespace-nowrap"
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
