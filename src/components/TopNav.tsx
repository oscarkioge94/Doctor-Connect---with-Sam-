import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  LogOut,
  UserCheck,
  ShieldAlert,
  Stethoscope,
  ClipboardList
} from 'lucide-react';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  healthConnected: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ activeTab, setActiveTab, healthConnected }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isReceptionist = user.role === 'receptionist';
  const isDoctor = user.role === 'doctor';
  const isAdmin = user.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xl shadow-inner">
              <Activity className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Doctor Connect</span>
                <span className="text-xs bg-teal-500/20 text-teal-300 font-medium px-2 py-0.5 rounded-full border border-teal-500/30">
                  Clinic OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Healthcare Management System</p>
            </div>
          </div>

          {/* Navigation Links (Role Based) */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {isReceptionist && (
              <>
                <button
                  id="nav-receptionist-booking"
                  onClick={() => setActiveTab('receptionist')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'receptionist'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden md:inline">Booking Dashboard</span>
                </button>
                <button
                  id="nav-patients-list"
                  onClick={() => setActiveTab('patients')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'patients'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Patients</span>
                </button>
              </>
            )}

            {isDoctor && (
              <>
                <button
                  id="nav-doctor-dashboard"
                  onClick={() => setActiveTab('doctor')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'doctor'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span className="hidden md:inline">Doctor Workstation</span>
                </button>
                <button
                  id="nav-doctor-patients"
                  onClick={() => setActiveTab('patients')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'patients'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Patient Records</span>
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  id="nav-admin-dashboard"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics & Reports</span>
                </button>
                <button
                  id="nav-patients-list-admin"
                  onClick={() => setActiveTab('patients')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'patients'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Patients</span>
                </button>
              </>
            )}

            {/* Reminders Portal (Shared for Reception & Admin) */}
            {(isReceptionist || isAdmin) && (
              <button
                id="nav-reminders-portal"
                onClick={() => setActiveTab('reminders')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'reminders'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden lg:inline">Africa's Talking SMS</span>
              </button>
            )}
          </nav>

          {/* User Profile & Health Status Indicator */}
          <div className="flex items-center space-x-3">
            {/* Health status badge */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                healthConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}
              title={healthConnected ? 'Backend API Connection Active' : 'Connecting to API...'}
            >
              <span className={`w-2 h-2 rounded-full ${healthConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px]">{healthConnected ? 'API Online' : 'Connecting'}</span>
            </div>

            {/* Current user role info */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-100">{user.fullName}</div>
              <div className="text-xs text-slate-400 capitalize flex items-center justify-end space-x-1">
                {isDoctor && <Stethoscope className="w-3 h-3 text-emerald-400 inline" />}
                {isReceptionist && <UserCheck className="w-3 h-3 text-teal-400 inline" />}
                {isAdmin && <ShieldAlert className="w-3 h-3 text-sky-400 inline" />}
                <span>
                  {user.role} {user.specialty ? `• ${user.specialty}` : ''}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              id="btn-logout"
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
