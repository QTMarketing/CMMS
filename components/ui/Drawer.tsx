import React from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string; // default w-96 for desktop
}

export default function Drawer({ open, onClose, children, width = "w-96" }: DrawerProps) {
  // Responsive: full width on mobile, normal width on md+
  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition bg-black/40 ${open ? "block" : "hidden"}`}
        onClick={onClose}
        aria-label="Close drawer background"
      />
      <aside
        className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 transform transition-transform duration-200 ease-in-out
          w-full max-w-full md:${width} ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ width: "100vw", maxWidth: "100vw" }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <button className="absolute top-4 right-5 text-gray-400 hover:text-gray-600 text-2xl font-bold" onClick={onClose} aria-label="Close drawer">
          &times;
        </button>
        <div className="h-16" /> {/* Spacer for close button */}
        <div className="p-2 sm:p-4 md:p-6 overflow-y-auto h-[calc(100vh-4rem)] space-y-4 text-sm">{children}</div>
      </aside>
    </>
  );
}
