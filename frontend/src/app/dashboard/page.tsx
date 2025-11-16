/**
 * Dashboard Home Page
 * TEMS - Terrapin Events Management System
 */

'use client';

import { useAuthContext } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Calendar, Users, TrendingUp, Clock } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: typeof Calendar;
  trend?: {
    value: string;
    positive: boolean;
  };
}

function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const router = useRouter();

  const handleCreateEvent = () => {
    router.push('/events/new');
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.givenName}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your events today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value="24"
          icon={Calendar}
          trend={{ value: '12% from last month', positive: true }}
        />
        <StatCard
          title="Upcoming Events"
          value="8"
          icon={Clock}
          trend={{ value: '3 this week', positive: true }}
        />
        <StatCard
          title="Total Attendees"
          value="1,234"
          icon={Users}
          trend={{ value: '23% from last month', positive: true }}
        />
        <StatCard
          title="Engagement Rate"
          value="87%"
          icon={TrendingUp}
          trend={{ value: '5% from last month', positive: true }}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                New event created
              </p>
              <p className="text-sm text-gray-600">
                "Fall Fest 2025" was created successfully
              </p>
              <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                New registrations
              </p>
              <p className="text-sm text-gray-600">
                45 new attendees registered for "Spring Concert"
              </p>
              <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Event trending
              </p>
              <p className="text-sm text-gray-600">
                "Tech Talk Series" is trending on campus
              </p>
              <p className="text-xs text-gray-500 mt-1">1 day ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            onClick={handleCreateEvent}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">Create Event</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">Manage Attendees</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">View Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
}
