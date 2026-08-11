/**
 * app/admin/analytics/page.tsx
 * ─────────────────────────────────────────────────────
 * Analytics Dashboard for Echo
 * Admin analytics for platform health monitoring
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";

interface AnalyticsData {
  totalUsers: number;
  totalPosts: number;
  totalRooms: number;
  totalClashes: number;
  activeUsers24h: number;
  posts24h: number;
  rooms24h: number;
  clashes24h: number;
  topHashtags: Array<{ tag: string; count: number }>;
  topCreators: Array<{ uid: string; handle: string; postCount: number }>;
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("24h");

  useEffect(() => {
    // Check if user is admin
    if (user && user.email !== "admin@echo.com") {
      // Redirect non-admin users
      window.location.href = "/";
      return;
    }

    fetchAnalytics();
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from an API endpoint
      // For now, we'll use mock data
      const mockData: AnalyticsData = {
        totalUsers: 1250,
        totalPosts: 8500,
        totalRooms: 320,
        totalClashes: 85,
        activeUsers24h: 450,
        posts24h: 120,
        rooms24h: 15,
        clashes24h: 8,
        topHashtags: [
          { tag: "music", count: 450 },
          { tag: "podcast", count: 320 },
          { tag: "voice", count: 280 },
          { tag: "story", count: 250 },
          { tag: "debate", count: 180 },
        ],
        topCreators: [
          { uid: "user1", handle: "@creator1", postCount: 85 },
          { uid: "user2", handle: "@creator2", postCount: 72 },
          { uid: "user3", handle: "@creator3", postCount: 65 },
          { uid: "user4", handle: "@creator4", postCount: 58 },
          { uid: "user5", handle: "@creator5", postCount: 45 },
        ],
      };

      setAnalytics(mockData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.email !== "admin@echo.com") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Access Denied</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Users</div>
            <div className="text-3xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
            <div className="text-green-400 text-sm mt-2">
              +{analytics.activeUsers24h} active (24h)
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Posts</div>
            <div className="text-3xl font-bold">{analytics.totalPosts.toLocaleString()}</div>
            <div className="text-green-400 text-sm mt-2">
              +{analytics.posts24h} new (24h)
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Rooms</div>
            <div className="text-3xl font-bold">{analytics.totalRooms.toLocaleString()}</div>
            <div className="text-green-400 text-sm mt-2">
              +{analytics.rooms24h} new (24h)
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Debates</div>
            <div className="text-3xl font-bold">{analytics.totalClashes.toLocaleString()}</div>
            <div className="text-green-400 text-sm mt-2">
              +{analytics.clashes24h} new (24h)
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Hashtags */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Top Hashtags</h2>
            <div className="space-y-4">
              {analytics.topHashtags.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-purple-400 font-bold">#{index + 1}</div>
                    <div className="text-white">#{item.tag}</div>
                  </div>
                  <div className="text-gray-400">{item.count} posts</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Creators */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Top Creators</h2>
            <div className="space-y-4">
              {analytics.topCreators.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-purple-400 font-bold">#{index + 1}</div>
                    <div className="text-white">{item.handle}</div>
                  </div>
                  <div className="text-gray-400">{item.postCount} posts</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Metrics */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Platform Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-2">User Engagement</div>
              <div className="text-2xl font-bold text-green-400">High</div>
              <div className="text-gray-500 text-sm">36% DAU/MAU ratio</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">Content Quality</div>
              <div className="text-2xl font-bold text-green-400">Good</div>
              <div className="text-gray-500 text-sm">4.2 avg. rating</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">System Status</div>
              <div className="text-2xl font-bold text-green-400">Healthy</div>
              <div className="text-gray-500 text-sm">99.9% uptime</div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={fetchAnalytics}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
