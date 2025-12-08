"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Status = "offline" | "online" | "work_assigned";

const statusConfig: Record<
  Status,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  offline: {
    label: "Offline",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    dotColor: "bg-gray-500",
  },
  online: {
    label: "Online",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    dotColor: "bg-green-500",
  },
  work_assigned: {
    label: "Work Assigned",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    dotColor: "bg-blue-500",
  },
};

export default function TechnicianStatusToggle() {
  const { data: session, status: sessionStatus } = useSession();
  const technicianId = (session?.user as any)?.technicianId as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  const isTechnician = role === "TECHNICIAN";

  const [status, setStatus] = useState<Status>("offline");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch current status on mount
  useEffect(() => {
    // Wait for session to be loaded
    if (sessionStatus === "loading") {
      return;
    }

    if (isTechnician && technicianId) {
      setIsInitializing(true);
      fetch(`/api/technicians/${technicianId}`)
        .then((res) => {
          if (!res.ok) {
            // If 404 or other error, just use default status
            console.warn("Failed to fetch technician status, using default");
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success && data.data?.status) {
            // Validate the status is one of our valid options
            const fetchedStatus = data.data.status as string;
            if (["offline", "online", "work_assigned"].includes(fetchedStatus)) {
              setStatus(fetchedStatus as Status);
            }
          }
          // If no status in response, keep default "offline" status
        })
        .catch((err) => {
          // Silently handle errors - component will use default "offline" status
          console.warn("Error fetching technician status:", err);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, [isTechnician, technicianId, sessionStatus]);

  // Don't render if not a technician or session is loading
  if (sessionStatus === "loading" || !isTechnician || !technicianId) {
    return null;
  }

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: Status) => {
    if (newStatus === status || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/technicians/${technicianId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      // Check if response has content
      const contentType = response.headers.get("content-type");
      const isJson = contentType?.includes("application/json");
      
      let data: any = {};
      
      try {
        const text = await response.text();
        
        if (!text || text.trim() === "") {
          console.warn("Empty response body from server");
          if (!response.ok) {
            alert(`Failed to update status: Server returned empty response (${response.status} ${response.statusText})`);
            return;
          }
          // If response is OK but empty, treat as success with empty data
          data = { success: true };
        } else if (isJson) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError, "Text:", text);
            alert(`Failed to update status: Server returned invalid JSON (${response.status})`);
            return;
          }
        } else {
          console.error("Non-JSON response:", text);
          alert(`Failed to update status: Server returned non-JSON response (${response.status})`);
          return;
        }
      } catch (readError) {
        console.error("Error reading response:", readError);
        alert(`Failed to update status: Error reading server response (${response.status})`);
        return;
      }

      if (!response.ok) {
        console.error("API error response:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          data,
        });
        const errorMsg = data?.error || data?.details || `HTTP ${response.status} ${response.statusText}`;
        alert(`Failed to update status: ${errorMsg}`);
        return;
      }

      if (data.success) {
        setStatus(newStatus);
        setIsOpen(false);
      } else {
        console.error("Failed to update status:", data);
        alert(`Failed to update status: ${data?.error || data?.details || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert(`Failed to update status: ${error?.message || "Network error. Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const currentConfig = statusConfig[status];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentConfig.bgColor} ${currentConfig.color} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span
          className={`w-2 h-2 rounded-full ${currentConfig.dotColor} ${
            status === "online" ? "animate-pulse" : ""
          }`}
        />
        <span>{currentConfig.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              {(Object.keys(statusConfig) as Status[]).map((statusOption) => {
                const config = statusConfig[statusOption];
                const isSelected = statusOption === status;
                return (
                  <button
                    key={statusOption}
                    onClick={() => handleStatusChange(statusOption)}
                    disabled={loading}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isSelected
                        ? `${config.bgColor} ${config.color} font-semibold`
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${config.dotColor} ${
                        statusOption === "online" ? "animate-pulse" : ""
                      }`}
                    />
                    <span>{config.label}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 ml-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

