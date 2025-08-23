/**
 * Admin Activity Page
 * Main page for viewing user activity tracking and analytics
 */

import React from "react";
import AdminActivityDashboard from "@/components/AdminActivityDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Dashboard - Admin",
  description: "View and analyze user activity and system events",
};

export default function AdminActivityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminActivityDashboard />
    </div>
  );
}
