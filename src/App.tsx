/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CentreProvider } from './contexts/CentreContext';
import { Login } from './pages/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { ChildrenList } from './pages/ChildrenList';
import { AttendancePage } from './pages/AttendancePage';
import { DailyUpdates } from './pages/DailyUpdates';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ParentDashboard } from './pages/ParentDashboard';
import { FeesPage } from './pages/FeesPage';
import { StaffPage } from './pages/StaffPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { EventsPage } from './pages/EventsPage';
import { CalendarPage } from './pages/CalendarPage';

function AppContent() {
  const { currentUser, loading } = useAuth();
  
  // Tab/Routing system
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Shared trigger states
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [showCreateNoticeForm, setShowCreateNoticeForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mb-4" />
        <h2 className="font-extrabold text-base text-slate-800 tracking-tight">Aangan Portal</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">Checking Secure Auth Session...</p>
      </div>
    );
  }

  // Secure Route Gate
  if (!currentUser) {
    return <Login />;
  }

  // Unified controller to trigger child addition from Dashboard
  const triggerAddChild = () => {
    setShowAddChildForm(true);
    setActiveTab('children');
  };

  // Unified controller to trigger notification creation from Dashboard
  const triggerCreateNotification = () => {
    setShowCreateNoticeForm(true);
    setActiveTab('notifications');
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        currentUser.role === 'parent' ? (
          <ParentDashboard />
        ) : (
          <Dashboard 
            setActiveTab={setActiveTab} 
            onAddChildClick={triggerAddChild}
            onCreateNotificationClick={triggerCreateNotification}
          />
        )
      )}
      
      {activeTab === 'children' && (
        <ChildrenList 
          showAddForm={showAddChildForm} 
          setShowAddForm={setShowAddChildForm} 
        />
      )}
      
      {activeTab === 'attendance' && <AttendancePage />}
      
      {activeTab === 'fees' && <FeesPage />}
      {activeTab === 'staff' && <StaffPage />}
      {activeTab === 'events' && <EventsPage />}
      {activeTab === 'incidents' && <IncidentsPage />}
      {activeTab === 'calendar' && <CalendarPage />}
      
      {activeTab === 'updates' && <DailyUpdates />}
      
      {activeTab === 'notifications' && (
        <NotificationsPage 
          showCreateForm={showCreateNoticeForm} 
          setShowCreateForm={setShowCreateNoticeForm} 
        />
      )}
      
      {activeTab === 'reports' && <ReportsPage />}
      
      {activeTab === 'settings' && <SettingsPage />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <CentreProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
    </CentreProvider>
  );
}
