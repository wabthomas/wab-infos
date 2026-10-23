/** Logo Google Play officiel (public/icons/google-play.png, 96 px). */
export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/google-play.png"
      alt=""
      width={96}
      height={96}
      className={className}
      style={{ objectFit: 'contain' }}
      aria-hidden
    />
  );
}
