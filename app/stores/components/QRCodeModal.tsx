"use client";

import { useState, useEffect } from "react";

interface QRCodeModalProps {
  storeId: string;
  storeName: string;
  open: boolean;
  onClose: () => void;
}

export default function QRCodeModal({
  storeId,
  storeName,
  open,
  onClose,
}: QRCodeModalProps) {
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    qrCode: string;
    qrUrl: string;
    qrImage: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && storeId) {
      fetchQRCode();
    }
  }, [open, storeId]);

  const fetchQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/qr`);
      const data = await res.json();

      if (data.success && data.data) {
        setQrData(data.data);
      } else {
        setError(data.error || "Failed to load QR code.");
      }
    } catch (err) {
      console.error("Error fetching QR code:", err);
      setError("Failed to load QR code.");
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrData?.qrImage) return;

    const link = document.createElement("a");
    link.href = qrData.qrImage;
    link.download = `qr-code-${storeName.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyUrl = () => {
    if (!qrData?.qrUrl) return;
    navigator.clipboard.writeText(qrData.qrUrl);
    alert("URL copied to clipboard!");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating QR code...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchQRCode}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {qrData && !loading && (
          <>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-2">{storeName}</p>
              <div className="flex justify-center mb-4">
                <img
                  src={qrData.qrImage}
                  alt="QR Code"
                  className="border border-gray-200 rounded"
                />
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Scan this QR code to create a work order
              </p>
              <div className="bg-gray-50 rounded p-2 mb-4">
                <p className="text-xs text-gray-600 break-all">{qrData.qrUrl}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={downloadQRCode}
                className="flex-1 bg-blue-600 text-white text-sm font-semibold rounded-md py-2 px-4 hover:bg-blue-700"
              >
                Download QR Code
              </button>
              <button
                onClick={copyUrl}
                className="flex-1 bg-gray-200 text-gray-700 text-sm font-semibold rounded-md py-2 px-4 hover:bg-gray-300"
              >
                Copy URL
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

