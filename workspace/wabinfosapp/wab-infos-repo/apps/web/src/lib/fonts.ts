import {
  Inter,
  JetBrains_Mono,
  Oswald,
  Playfair_Display,
  Roboto,
} from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-headline',
  display: 'swap',
});

export const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-brand',
  display: 'swap',
});

export const fontVariables = [
  inter.variable,
  jetbrainsMono.variable,
  playfair.variable,
  roboto.variable,
  oswald.variable,
].join(' ');
