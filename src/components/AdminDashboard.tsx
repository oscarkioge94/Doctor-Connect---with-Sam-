import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ClinicStats } from '../types';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  Calendar,
  CheckCircle2,
  Stethoscope,
  MessageSquare,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadCSV = () => {
    window.open(api.exportReportCSVUrl(), '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-sky-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-sm font-semibold mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Clinic Administration & Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Executive Dashboard & Reporting</h1>
          <p className="text-slate-300 text-sm mt-1">
            Real-time appointment volumes, doctor workload distribution, and downloadable CSV audit reports.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="btn-export-csv"
            onClick={handleDownloadCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Audit Report</span>
          </button>

          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Appointments</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.todayAppointmentsCount}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {stats.completedToday} completed • {stats.scheduledToday} pending
              </p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalPatients}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Registered in directory</p>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Doctors</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalDoctors}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">On duty staff</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SMS Reminders</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.smsSentToday}</p>
              <p className="text-xs text-teal-600 font-medium mt-1">Dispatched via Africa's Talking</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Visualizer & Doctor Workload Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Daily Appointment Volume */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900">7-Day Appointment Trends</h2>
              </div>
              <span className="text-xs text-slate-500 font-semibold">Daily Volume</span>
            </div>

            <div className="space-y-4 pt-2">
              {stats.dailyCounts.map((day) => {
                const maxCount = Math.max(...stats.dailyCounts.map((d) => d.count), 1);
                const pct = Math.round((day.count / maxCount) * 100);

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{day.date}</span>
                      <span>
                        {day.count} Total ({day.completed} completed)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                      <div
                        className="bg-sky-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Doctor Workload Distribution */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900">Doctor Patient Load</h2>
              </div>
              <span className="text-xs text-slate-500 font-semibold">Consultations</span>
            </div>

            <div className="space-y-3">
              {stats.doctorWorkload.map((doc) => (
                <div key={doc.doctorName} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{doc.doctorName}</div>
                    <div className="text-xs text-slate-500">Scheduled Appointments</div>
                  </div>

                  <div className="text-2xl font-extrabold text-sky-700 bg-white px-3 py-1 rounded-xl border border-sky-100">
                    {doc.count}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleDownloadCSV}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span>Download Full CSV Clinic Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
