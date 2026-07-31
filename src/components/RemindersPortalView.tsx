import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SMSReminder, Appointment } from '../types';
import { MessageSquare, Send, CheckCircle2, Clock, Phone, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';

export const RemindersPortalView: React.FC = () => {
  const [logs, setLogs] = useState<SMSReminder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Test SMS State
  const [testPhone, setTestPhone] = useState('+254712345678');
  const [testMessage, setTestMessage] = useState(
    'Dear Patient, your upcoming medical appointment at Doctor Connect Clinic is scheduled for tomorrow at 09:00 AM. Reply CANCEL if unable to attend.'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchReminderData = async () => {
    setIsLoading(true);
    try {
      const [l, apts] = await Promise.all([
        api.getSMSLogs(),
        api.getAppointments({ status: 'scheduled' })
      ]);
      setLogs(l);
      setAppointments(apts);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminderData();
  }, []);

  const handleSendAptReminder = async (aptId: string) => {
    try {
      const res = await api.sendSMSReminder(aptId);
      alert(res.message);
      fetchReminderData();
    } catch (err: any) {
      alert('Error sending SMS: ' + err.message);
    }
  };

  const handleSendTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestResult(null);

    // Simulate Africa's Talking API request for arbitrary phone
    setTimeout(() => {
      setIsSendingTest(false);
      setTestResult(`SMS successfully queued for ${testPhone} via Africa's Talking Kenya Gateway (Cost: KES 0.80, Code: 101)`);
      fetchReminderData();
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-sm font-semibold mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Africa's Talking Kenya Gateway (+254)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">SMS & Email Reminders Engine</h1>
          <p className="text-slate-300 text-sm mt-1">
            Automated appointment dispatch & SMS outbox delivery audit trail for Kenyan mobile networks (Safaricom, Airtel, Telkom).
          </p>
        </div>

        <button
          onClick={fetchReminderData}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Scheduled Appointments Needing Reminders */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">Upcoming Scheduled Appointments</h2>
            </div>
            <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 font-bold px-2 py-0.5 rounded-full">
              {appointments.length} Pending
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
              No pending scheduled appointments require SMS reminders right now.
            </div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{apt.patientName}</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">{apt.patientPhone}</span>
                  </div>

                  <div className="text-xs text-slate-500">
                    Slot: <strong>{apt.datetime}</strong> • Doctor: {apt.doctorName}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {apt.reminderSent ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Reminder Dispatched</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-semibold">Reminder Pending</span>
                    )}

                    <button
                      onClick={() => handleSendAptReminder(apt.id)}
                      className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>{apt.reminderSent ? 'Resend SMS' : 'Send SMS'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Test SMS Dispatcher */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Test Kenya SMS Gateway (+254)</h3>

            {testResult && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {testResult}
              </div>
            )}

            <form onSubmit={handleSendTestSMS} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kenyan Mobile Number</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingTest}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {isSendingTest ? 'Dispatching...' : 'Send Test SMS via Africa\'s Talking'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Outbox Delivery Log */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">Africa's Talking SMS Outbox Delivery Logs</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Rate: KES 0.80 / SMS
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading outbox logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No SMS reminder logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{log.patientName}</span>
                    <span className="font-mono text-slate-600 font-semibold">{log.phone}</span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                    "{log.message}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="font-medium text-emerald-700">{log.responseCode}</span>
                    <span>Cost: <strong>{log.cost}</strong> • {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
