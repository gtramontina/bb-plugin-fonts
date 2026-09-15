// Clicking a scrollbar reports a pointerdown on the scroll container itself, which
// Radix would otherwise read as an outside interaction and dismiss the popover on.
// The pointer lands in the scrollbar gutter: outside the target's client box.
interface DismissEvent {
  detail: { originalEvent: PointerEvent };
  preventDefault(): void;
}

export function keepOpenOnScrollbar(event: DismissEvent) {
  const pointer = event.detail.originalEvent;
  const target = pointer.target;
  if (!(target instanceof HTMLElement)) return;
  const rect = target.getBoundingClientRect();
  const inGutter = pointer.clientX > rect.left + target.clientWidth
    || pointer.clientY > rect.top + target.clientHeight;
  if (inGutter) event.preventDefault();
}
