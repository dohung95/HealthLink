import { useEffect, useRef } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getWrappedFocusIndex(count, currentIndex, shiftKey) {
  if (count < 1) return null;
  if (currentIndex < 0) return shiftKey ? count - 1 : 0;
  if (shiftKey && currentIndex === 0) return count - 1;
  if (!shiftKey && currentIndex === count - 1) return 0;
  return null;
}

const getFocusableElements = (dialog) => dialog
  ? [...dialog.querySelectorAll(focusableSelector)].filter((element) => !element.hasAttribute('hidden'))
  : [];

export function useModalFocus({
  active,
  closeDisabled = false,
  dialogRef,
  focusKey,
  initialFocusSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
  onClose,
  openerRef,
  restoreOnDeactivate = true,
}) {
  const hasOpenedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) {
      if (hasOpenedRef.current && restoreOnDeactivate) {
        openerRef?.current?.focus?.();
        hasOpenedRef.current = false;
      }
      return undefined;
    }

    hasOpenedRef.current = true;
    const dialog = dialogRef.current;
    const frame = window.requestAnimationFrame(() => {
      const firstControl = dialog?.querySelector(initialFocusSelector) || getFocusableElements(dialog)[0];
      firstControl?.focus();
    });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!closeDisabled) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = getFocusableElements(dialogRef.current);
      const targetIndex = getWrappedFocusIndex(elements.length, elements.indexOf(document.activeElement), event.shiftKey);
      if (targetIndex === null) return;
      event.preventDefault();
      elements[targetIndex]?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, closeDisabled, dialogRef, focusKey, initialFocusSelector, openerRef, restoreOnDeactivate]);
}
