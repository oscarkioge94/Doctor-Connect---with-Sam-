import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User, LoginEvent, AuditLogEntry, ClinicStats } from '../types';
import {
  BarChart3, Users, Download, RefreshCw, Plus, ShieldCheck,
  UserCheck, Stethoscope, Lock, KeyRound, AlertCircle, CheckCircle2,
  Clock, Activity, FileText, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [loginTotal, setLoginTotal] = useState<number>(0);
  const [loginPage, setLoginPage] = useState<number>(1);
  const [loginUserFilter, setLoginUserFilter] = useState<string>('all');

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all');

  const [activeTab, setActiveTab] = useState<'users' | 'logins' | 'audit'>('users');
  const [isLoading, setIsLoading] = useState(true);

  // Modal for Admin User Creation
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'receptionist' | 'doctor' | 'admin'>('receptionist');
  const [newUserSpecialty, setNewUserSpecialty] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('test123');
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Modal for Audit Log Details
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);

  const fetchStats = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  };

  const fetchLoginEvents = async (page = 1, uId = 'all') => {
    try {
      const res = await api.getLoginEvents(uId === 'all' ? undefined : uId, page, 15);
      setLoginEvents(res.items);
      setLoginTotal(res.total);
    } catch (err) {
      console.error('Failed to load login events:', err);
    }
  };

  const fetchAuditLogs = async (page = 1, uId = 'all') => {
    try {
      const res = await api.getAuditLogs(uId === 'all' ? undefined : uId, page, 15);
      setAuditLogs(res.items);
      setAuditTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchLoginEvents(loginPage, loginUserFilter),
      fetchAuditLogs(auditPage, auditUserFilter)
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    fetchLoginEvents(loginPage, loginUserFilter);
  }, [loginPage, loginUserFilter]);

  useEffect(() => {
    fetchAuditLogs(auditPage, auditUserFilter);
  }, [auditPage, auditUserFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    setAddUserSuccess(null);
    setIsSubmittingUser(true);

    try {
      await api.createAdminUser({
        email: newUserEmail,
        fullName: newUserFullName,
        role: newUserRole,
        specialty: newUserSpecialty,
        phone: newUserPhone,
        password: newUserPassword
      });
      setAddUserSuccess(`Staff account for ${newUserFullName} (${newUserRole}) created successfully!`);
      setNewUserEmail('');
      setNewUserFullName('');
      setNewUserSpecialty('');
      setNewUserPhone('');
      await fetchUsers();
      await fetchAuditLogs(1, auditUserFilter);
    } catch (err: any) {
      setAddUserError(err.message || 'Failed to create staff account.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleExportCSV = () => {
    window.open(api.exportReportCSVUrl(), '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-sky-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-sm font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Clinic Administration & Security Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Staff Management & System Audit Log</h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage authorized personnel, monitor active login sessions, and review immutable audit records.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Audit Report</span>
          </button>

          <button
            onClick={refreshAllData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Staff Users</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{users.length}</p>
              <p className="text-xs text-teal-600 font-medium mt-1">Admin, Doctors & Reception</p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalPatients}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Directory size</p>
            </div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Appointments</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.todayAppointments}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">{stats.completedAppointments} Completed</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SMS Reminders Sent</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalRemindersSent}</p>
              <p className="text-xs text-purple-600 font-medium mt-1">Africa's Talking Gateway</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Admin Section Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Navigation Header */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Staff Personnel ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('logins')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logins'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Login Activity Feed ({loginTotal})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              System Audit Trail ({auditTotal})
            </button>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={() => { setIsAddUserOpen(true); setAddUserError(null); setAddUserSuccess(null); }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Staff Account</span>
            </button>
          )}
        </div>

        {/* TAB 1: STAFF USERS */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role & Specialty</th>
                    <th className="py-3 px-4">2FA Contact Phone</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          {u.role === 'doctor' && <Stethoscope className="w-4 h-4 text-emerald-600" />}
                          {u.role === 'receptionist' && <UserCheck className="w-4 h-4 text-teal-600" />}
                          {u.role === 'admin' && <ShieldCheck className="w-4 h-4 text-sky-600" />}
                          <span className="font-semibold capitalize text-slate-800">{u.role}</span>
                        </div>
                        {u.specialty && <div className="text-xs text-slate-500">{u.specialty}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {u.phone || 'Not configured'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never logged in'}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isCurrentlyActive ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active Now</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <span>Offline</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LOGIN EVENTS */}
        {activeTab === 'logins' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-700">Filter by User:</span>
                <select
                  value={loginUserFilter}
                  onChange={(e) => { setLoginUserFilter(e.target.value); setLoginPage(1); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none"
                >
                  <option value="all">All Personnel & Login Attempts</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Total Login Events: <span className="font-bold text-slate-900">{loginTotal}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User / Email</th>
                    <th className="py-3 px-4">Auth Method</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loginEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-xs font-bold text-slate-900">{e.relativeTime}</div>
                        <div className="text-[11px] text-slate-400">{new Date(e.timestamp).toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{e.userName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 font-mono">{e.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200">
                          {e.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {e.ipAddress}
                      </td>
                      <td className="py-3 px-4">
                        {e.success ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Successful</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800" title={e.failureReason}>
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed ({e.failureReason || 'Invalid'})</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Page {loginPage} of {Math.ceil(loginTotal / 15) || 1}</span>
              <div className="flex space-x-2">
                <button
                  disabled={loginPage <= 1}
                  onClick={() => setLoginPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 inline" /> Previous
                </button>
                <button
                  disabled={loginPage >= Math.ceil(loginTotal / 15)}
                  onClick={() => setLoginPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4 inline" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-700">Filter by Actor:</span>
                <select
                  value={auditUserFilter}
                  onChange={(e) => { setAuditUserFilter(e.target.value); setAuditPage(1); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none"
                >
                  <option value="all">All Staff Actions</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Total Audit Entries: <span className="font-bold text-slate-900">{auditTotal}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action & Entity</th>
                    <th className="py-3 px-4">Human Description</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-xs font-bold text-slate-900">{log.relativeTime}</div>
                        <div className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{log.userName}</div>
                        <div className="text-xs text-slate-500 capitalize">{log.userRole}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
                          {log.action}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{log.entityType} • {log.entityId}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-800">
                        {log.description}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Raw Audit Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Page {auditPage} of {Math.ceil(auditTotal / 15) || 1}</span>
              <div className="flex space-x-2">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 inline" /> Previous
                </button>
                <button
                  disabled={auditPage >= Math.ceil(auditTotal / 15)}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4 inline" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE STAFF USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
                <div>
                  <h3 className="font-bold text-lg leading-tight">Create Staff Account</h3>
                  <p className="text-xs text-slate-400">Add Receptionist, Doctor, or Admin</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {addUserError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {addUserError}
                </div>
              )}

              {addUserSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  {addUserSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  placeholder="Dr. Samuel Mbugua"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="samuel.m@medflow.co.ke"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e: any) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+254 712 345678"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {newUserRole === 'doctor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={newUserSpecialty}
                    onChange={(e) => setNewUserSpecialty(e.target.value)}
                    placeholder="Pediatrics & Internal Medicine"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 font-mono outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAW AUDIT LOG DETAILS MODAL */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">Audit Log Payload Detail</h3>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-xs text-slate-600 font-medium">
                <span className="font-bold text-slate-900">Actor:</span> {selectedAuditLog.userName} ({selectedAuditLog.userRole})
              </div>
              <div className="text-xs text-slate-600 font-medium">
                <span className="font-bold text-slate-900">Action:</span> {selectedAuditLog.action}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                <span className="font-bold text-slate-900">Description:</span> {selectedAuditLog.description}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Payload JSON:</label>
                <pre className="bg-slate-900 text-emerald-400 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-60">
                  {JSON.stringify(selectedAuditLog.details, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
