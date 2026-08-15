'use client';

import { useRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

function isPrimaryPointer(event: React.PointerEvent): boolean {
  return event.pointerType !== 'mouse' || event.button === 0;
}

/**
 * Android WebView : preventDefault() sur pointerdown annule souvent le click.
 * On exécute l’action tout de suite, et on ignore le click de compatibilité.
 */
export function useKeepEditorFocusActivate(
  onActivate: () => void,
  extraPointerDown?: () => void
) {
  const armedRef = useRef(false);
  const onActivateRef = useRef(onActivate);
  const extraRef = useRef(extraPointerDown);
  onActivateRef.current = onActivate;
  extraRef.current = extraPointerDown;

  return {
    onPointerDown: (event: React.PointerEvent) => {
      if (!isPrimaryPointer(event)) return;
      event.preventDefault();
      extraRef.current?.();
      armedRef.current = true;
      onActivateRef.current();
    },
    onClick: (event: React.MouseEvent) => {
      if (armedRef.current) {
        armedRef.current = false;
        event.preventDefault();
        return;
      }
      onActivateRef.current();
    },
  };
}

type KeepEditorFocusButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'onPointerDown' | 'type'
> & {
  onActivate: () => void;
  onPointerDownExtra?: () => void;
};

export function KeepEditorFocusButton({
  onActivate,
  onPointerDownExtra,
  className,
  children,
  ...rest
}: KeepEditorFocusButtonProps) {
  const activate = useKeepEditorFocusActivate(onActivate, onPointerDownExtra);
  return (
    <button type="button" className={cn('touch-manipulation', className)} {...rest} {...activate}>
      {children}
    </button>
  );
}
