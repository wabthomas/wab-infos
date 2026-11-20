import fs from 'node:fs';
// ThemeToggle : variante inverse pour les headers colorés.
{
  const file = 'apps/redaction/src/components/ui/theme-toggle.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("export function ThemeToggle({\n  className,\n  labeled = false,\n}: {\n  className?: string;\n  labeled?: boolean;\n}) {", "export function ThemeToggle({\n  className,\n  labeled = false,\n  tone = 'default',\n}: {\n  className?: string;\n  labeled?: boolean;\n  tone?: 'default' | 'inverse';\n}) {");
  text = text.replace("  const isDark = theme === 'dark';", "  const isDark = theme === 'dark';\n  const inverse = tone === 'inverse';");
  text = text.replace("          : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted',", "          : inverse\n            ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white shadow-sm transition-colors hover:bg-white/25'\n            : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted',");
  fs.writeFileSync(file, text, 'utf8');
  console.log('THEME', text.includes('tone?:') && text.includes('inverse') ? 'OK' : 'MISS');
}
// MyRhTopbarActions : variante inverse.
{
  const file = 'apps/redaction/src/components/redaction/rh/my-rh-topbar.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("export function MyRhTopbarActions() {", "export function MyRhTopbarActions({ tone = 'default' }: { tone?: 'default' | 'inverse' } = {}) {");
  text = text.replace("  const pathname = usePathname();", "  const pathname = usePathname();\n  const inverse = tone === 'inverse';");
  text = text.replace('className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"', 'className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full ${inverse ? \'text-white hover:bg-white/20\' : \'text-foreground hover:bg-muted\'}`}');
  text = text.replace('className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-foreground shadow-sm"', 'className={`inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border shadow-sm ${inverse ? \'border-white/30 bg-white/15 text-white\' : \'border-border bg-card text-foreground\'}`}');
  fs.writeFileSync(file, text, 'utf8');
  console.log('ACTIONS', text.includes('tone') && text.includes('inverse') ? 'OK' : 'MISS');
}
