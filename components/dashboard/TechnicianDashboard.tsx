"use client";

import { useState } from "react";
import Link from "next/link";

type WorkOrder = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  asset: {
    name: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
};

type TechnicianDashboardProps = {
  technicianName: string;
  workOrders: WorkOrder[];
};

export default function TechnicianDashboard({
  technicianName,
  workOrders,
}: TechnicianDashboardProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Calculate KPIs
  const openWorkOrders = workOrders.filter((wo) => wo.status === "Open").length;
  const pendingTasks = workOrders.filter(
    (wo) => wo.status === "Open" || wo.status === "In Progress"
  ).length;

  const completedThisWeek = workOrders.filter((wo) => {
    if (wo.status !== "Completed" || !wo.completedAt) return false;
    const completed = new Date(wo.completedAt);
    return completed >= weekAgo;
  }).length;

  // Calculate average completion time (in hours)
  const completedOrders = workOrders.filter(
    (wo) => wo.status === "Completed" && wo.completedAt && wo.createdAt
  );
  let avgCompletionTime = 0;
  if (completedOrders.length > 0) {
    const totalHours = completedOrders.reduce((sum, wo) => {
      const created = new Date(wo.createdAt).getTime();
      const completed = new Date(wo.completedAt!).getTime();
      return sum + (completed - created) / (1000 * 60 * 60); // Convert to hours
    }, 0);
    avgCompletionTime = totalHours / completedOrders.length;
  }

  // Assigned work orders (Open and In Progress, sorted by priority and due date)
  const assignedWorkOrders = workOrders
    .filter((wo) => wo.status === "Open" || wo.status === "In Progress")
    .sort((a, b) => {
      // Sort by priority first (High > Medium > Low)
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      const priorityDiff =
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5);

  // Pending tasks (derived from work orders)
  const pendingTasksList = assignedWorkOrders.map((wo) => ({
    id: wo.id,
    title: wo.title,
    workOrderId: wo.id,
    dueDate: wo.dueDate,
    priority: wo.priority,
    assetName: wo.asset?.name || "Unknown Asset",
  }));

  // Today's schedule (work orders due today or in progress)
  const todaySchedule = workOrders
    .filter((wo) => {
      if (wo.status === "In Progress") return true;
      if (!wo.dueDate) return false;
      const due = new Date(wo.dueDate);
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      return dueDay.getTime() === today.getTime();
    })
    .sort((a, b) => {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return (
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      );
    });

  const priorityColors: Record<string, string> = {
    High: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300",
    Medium: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300",
    Low: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getGreeting = () => {
    const hour = now.getHours();
    return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  };

  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {technicianName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here&apos;s what&apos;s on your plate for today.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/requests"
            className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
          >
            <span className="text-base">+</span>
            <span className="truncate">New Request</span>
          </Link>
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
            <span className="text-base">⚠</span>
            <span className="truncate">Report Issue</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Open Work Orders</p>
          <p className="text-3xl font-bold text-blue-600">{openWorkOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingTasks}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed This Week</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{completedThisWeek}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Completion Time</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {avgCompletionTime > 0 ? `${avgCompletionTime.toFixed(1)} hrs` : "—"}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Work Orders */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight">
                Assigned Work Orders
              </h2>
              <Link
                href="/workorders"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="flow-root">
              <div className="-mx-6 -my-4 overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Work Order ID
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Asset
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Priority
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {assignedWorkOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No assigned work orders
                          </td>
                        </tr>
                      ) : (
                        assignedWorkOrders.map((wo) => (
                          <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium">
                              <Link
                                href={`/workorders/${wo.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {wo.id}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white">
                              {wo.asset?.name || "Unknown"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                  priorityColors[wo.priority] || priorityColors.Low
                                }`}
                              >
                                {wo.priority}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white">
                              {formatDate(wo.dueDate)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight mb-4">
              Pending Tasks
            </h2>
            <div className="flex flex-col gap-4">
              {pendingTasksList.length === 0 ? (
                <p className="text-sm text-gray-500">No pending tasks</p>
              ) : (
                pendingTasksList.map((task) => {
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
                  const daysUntilDue = dueDate
                    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  let dueText = "";
                  if (isDueToday) {
                    dueText = "Due Today";
                  } else if (daysUntilDue !== null) {
                    if (daysUntilDue === 1) {
                      dueText = "Due tomorrow";
                    } else if (daysUntilDue > 0) {
                      dueText = `Due in ${daysUntilDue} days`;
                    } else {
                      dueText = `Overdue by ${Math.abs(daysUntilDue)} days`;
                    }
                  }

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-3 -m-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <input
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        type="checkbox"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          From {task.workOrderId} - {dueText}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          priorityColors[task.priority] || priorityColors.Low
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight mb-4">
              Today&apos;s Schedule
            </h2>
            <div className="flex items-center justify-between mb-4">
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <span className="text-xl">‹</span>
              </button>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formattedDate}
              </p>
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <span className="text-xl">›</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {todaySchedule.length === 0 ? (
                <p className="text-sm text-gray-500">No scheduled tasks for today</p>
              ) : (
                todaySchedule.map((wo, index) => {
                  const colors = ["border-blue-500", "border-red-500", "border-yellow-500"];
                  const color = colors[index % colors.length] || "border-gray-300";
                  return (
                    <div key={wo.id} className="flex items-start gap-4">
                      <div className="w-16 text-right text-xs text-gray-600 dark:text-gray-400">
                        <p>
                          {index === 0
                            ? "09:00 AM"
                            : index === 1
                              ? "10:00 AM"
                              : index === 2
                                ? "01:00 PM"
                                : "03:00 PM"}
                        </p>
                      </div>
                      <div className={`flex-1 border-l-2 ${color} pl-4 pb-4`}>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Work on {wo.id}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {wo.asset?.name || "Unknown Asset"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

