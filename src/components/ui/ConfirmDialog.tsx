"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      className="m-auto w-[min(420px,90vw)] rounded-xl border border-line bg-pitch-2 p-5 text-chalk backdrop:bg-black/60"
    >
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-chalk-dim">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 font-medium text-chalk-dim hover:text-chalk">
          Cancelar
        </button>
        <button onClick={onConfirm} className="rounded-lg bg-red px-4 py-2 font-semibold text-white">
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
