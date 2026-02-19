"use client";

import { useRef } from "react";
import { rejectRequest } from "./actions";

export default function RejectRequestButton({
  requestId,
  requestTitle,
}: {
  requestId: string;
  requestTitle?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
      >
        Reject
      </button>
      <dialog
        ref={dialogRef}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg backdrop:bg-black/20 max-w-md w-full"
        onCancel={closeDialog}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Reject maintenance request
        </h3>
        {requestTitle && (
          <p className="text-sm text-gray-600 mb-3">Request: {requestTitle}</p>
        )}
        <form
          action={rejectRequest}
          method="post"
          className="flex flex-col gap-3"
          onSubmit={() => closeDialog()}
        >
          <input type="hidden" name="requestId" value={requestId} />
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Reason for rejection <span className="text-red-500">*</span>
            </span>
            <textarea
              name="rejectionReason"
              required
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/50"
              placeholder="Explain why this request is being rejected. This will be emailed to the submitter."
            />
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={closeDialog}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Reject &amp; send email
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
