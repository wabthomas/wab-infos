import { Inter, Playfair_Display, Roboto } from 'next/font/google';

/** Corps : une seule famille préchargée pour accélérer FCP/LCP mobile. */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
});

export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-headline',
  display: 'swap',
  preload: false,
});

export const fontVariables = [inter.variable, playfair.variable, roboto.variable].join(' ');
