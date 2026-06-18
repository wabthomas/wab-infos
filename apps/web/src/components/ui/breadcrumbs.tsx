import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground hover:underline">
            Accueil
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.name} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="hover:text-foreground hover:underline">
                {item.name}
              </Link>
            ) : (
              <span className="font-medium text-foreground" aria-current="page">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
