import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex items-center gap-1.5 text-sm text-text-muted">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                        {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                        {item.href ? (
                            <Link href={item.href} className="hover:text-text hover:underline">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-text font-medium">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
