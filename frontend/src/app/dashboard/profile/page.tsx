/**
 * Dashboard Profile Page
 * TEMS - Terrapin Events Management System
 * 
 * User profile management page
 */

'use client';

import { useState } from 'react';
import { useAuthContext } from '@/lib/auth/AuthContext';
import { Mail, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function DashboardProfilePage() {
  const { user } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600" />
        
        {/* Profile Content */}
        <div className="px-6 pb-6">
          {/* Avatar and Name */}
          <div className="flex items-end space-x-4 -mt-16 mb-6">
            <div className="h-24 w-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-blue-600">
              {user?.givenName?.[0]}{user?.familyName?.[0]}
            </div>
            <div className="pb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {user?.givenName} {user?.familyName}
              </h2>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <Input
                    value={user?.givenName || ''}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={user?.familyName || ''}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    value={user?.email || ''}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <Input
                    value={user?.role || 'PARTICIPANT'}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsEditing(false)}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            {/* Account Status */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Email Verification
                    </span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">
                    {user?.emailVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Account Type
                    </span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">
                    {user?.role || 'PARTICIPANT'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Member Since
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Security
              </h3>
              <div className="space-y-3">
                <Button variant="outline" fullWidth className="justify-start">
                  Change Password
                </Button>
                <Button variant="outline" fullWidth className="justify-start">
                  Enable Two-Factor Authentication
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
