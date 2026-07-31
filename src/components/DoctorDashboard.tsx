import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Patient, PatientNote, Appointment } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope,
  Clock,
  User,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  Send,
  Lock,
  History,
  Activity,
  PlusCircle,
  Sparkles,
  Search,
  ArrowLeft
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [selectedPatientDetail, setSelectedPatientDetail] = useState<(Patient & { notes: PatientNote[]; appointments: Appointment[] }) | null>(null);

  const [noteContent, setNoteContent] = useState('');
  const [visitType, setVisitType] = useState('General Consultation');
  const [bp, setBp] = useState('120/80');
  const [temp, setTemp] = useState('36.6°C');
  const [pulse, setPulse] = useState('72 bpm');

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load today's appointments for current logged in doctor (or all doctors if admin)
  const fetchDoctorData = async () => {
    setIsLoading(true);
    try {
      const apts = await api.getAppointments({
        date: todayStr,
        doctor_id: user?.role === 'doctor' ? user.id : undefined
      });
      setTodayAppointments(apts);

      // If we have appointments and none selected yet, open the first one automatically for continuous fast workflow!
      if (apts.length > 0 && !selectedAptId) {
        handleSelectAppointment(apts[0]);
      }
    } catch (err: any) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleSelectAppointment = async (apt: Appointment) => {
    setSelectedAptId(apt.id);
    setStatusMsg(null);
    try {
      const pDetail = await api.getPatientById(apt.patientId);
      setSelectedPatientDetail(pDetail);
    } catch (err: any) {
      console.error('Failed to load patient detail:', err);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientDetail || !noteContent.trim()) {
      setStatusMsg({ type: 'error', text: 'Clinical note text cannot be empty.' });
      return;
    }

    setIsSavingNote(true);
    setStatusMsg(null);

    try {
      const newNote = await api.appendClinicalNote(selectedPatientDetail.id, {
        note: noteContent.trim(),
        visitType,
        vitals: { bp, temp, pulse },
        appointmentId: selectedAptId || undefined
      });

      // Update patient detail state directly without page reload!
      setSelectedPatientDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          notes: [newNote, ...prev.notes]
        };
      });

      // Clear input fields for next note
      setNoteContent('');
      setStatusMsg({
        type: 'success',
        text: 'Clinical note appended to permanent history and appointment marked as completed!'
      });

      // Refresh today's appointment list status
      fetchDoctorData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to append note.' });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleMarkCompleted = async (aptId: string) => {
    try {
      await api.updateAppointmentStatus(aptId, 'completed');
      setStatusMsg({ type: 'success', text: 'Appointment marked as completed.' });
      fetchDoctorData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  const activeApt = todayAppointments.find((a) => a.id === selectedAptId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-emerald-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Clinical Workstation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {user?.fullName || 'Doctor'}'s Consultation Desk
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Continuous single-page patient consultation. Immutable medical history & append-only clinical notes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 text-xs font-semibold">
            {todayAppointments.filter((a) => a.status === 'completed').length} / {todayAppointments.length} Completed Today
          </div>
        </div>
      </div>

      {/* Main Continuous Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Today's Appointments Queue */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Today's Queue ({todayStr})</h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {todayAppointments.length} Total
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading today's schedule...</div>
          ) : todayAppointments.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {todayAppointments.map((apt) => {
                const isSelected = apt.id === selectedAptId;
                const isCompleted = apt.status === 'completed';

                return (
                  <button
                    key={apt.id}
                    onClick={() => handleSelectAppointment(apt)}
                    className={`w-full p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900">{apt.datetime.split(' ')[1]}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'scheduled'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">{apt.patientName}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {apt.patientGender} • ID: {apt.patientNationalId}
                    </div>

                    <div className="text-xs text-slate-600 italic mt-1 line-clamp-1">
                      "{apt.reason}"
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Single-Page Continuous Consultation View */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedPatientDetail ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm text-slate-500">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Select a patient from today's queue</h3>
              <p className="text-xs text-slate-500 mt-1">
                Click any patient on the left to view their complete history and append consultation notes instantly.
              </p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {statusMsg && (
                <div
                  className={`p-4 rounded-xl text-sm flex items-center justify-between ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-medium">
                    {statusMsg.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>{statusMsg.text}</span>
                  </div>
                </div>
              )}

              {/* Patient Summary Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                      {selectedPatientDetail.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-bold text-slate-900">{selectedPatientDetail.name}</h2>
                        <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                          {selectedPatientDetail.gender}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                        <span>Age: <strong>{calculateAge(selectedPatientDetail.dob)}</strong> (DOB: {selectedPatientDetail.dob})</span>
                        <span>• National ID: <strong>{selectedPatientDetail.nationalId}</strong></span>
                        <span>• Phone: <strong>{selectedPatientDetail.phone}</strong></span>
                      </div>
                    </div>
                  </div>

                  {activeApt && (
                    <div className="flex items-center space-x-2">
                      {activeApt.status === 'scheduled' && (
                        <button
                          id="btn-mark-completed"
                          onClick={() => handleMarkCompleted(activeApt.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Visit Completed</span>
                        </button>
                      )}
                      {activeApt.status === 'completed' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Visit Completed</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Visit Reason Banner */}
                {activeApt && (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start space-x-2">
                    <Activity className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-950 font-bold">Reason for Today's Appointment:</strong>{" "}
                      {activeApt.reason}
                    </div>
                  </div>
                )}
              </div>

              {/* Consultation Note Entry Box */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">Add Clinical Note (Append to Record)</h3>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-slate-500">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Immutable History Safeguard</span>
                  </div>
                </div>

                <form onSubmit={handleSaveNote} className="space-y-4">
                  {/* Vitals & Visit Type Quick Controls */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Visit Type</label>
                      <input
                        type="text"
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        placeholder="120/80"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Temperature</label>
                      <input
                        type="text"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        placeholder="36.6°C"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pulse</label>
                      <input
                        type="text"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        placeholder="72 bpm"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Main Clinical Note Text Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Clinical Observations & Diagnosis</label>
                      <span className="text-[11px] text-slate-400">SOAP / Free Form</span>
                    </div>
                    <textarea
                      id="input-clinical-note"
                      rows={4}
                      required
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Enter clinical examination notes, diagnosis, prescribed treatment, and follow-up advice..."
                      className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500 italic">
                      Old notes are permanently archived and cannot be edited or deleted.
                    </p>
                    <button
                      id="btn-save-note"
                      type="submit"
                      disabled={isSavingNote || !noteContent.trim()}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSavingNote ? 'Saving Note...' : 'Save & Append Note'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Timeline of Previous Visits & Notes (Scrollable, Newest First) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <History className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">Patient Medical History Timeline</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedPatientDetail.notes.length} Total Records
                  </span>
                </div>

                {selectedPatientDetail.notes.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
                    No prior clinical notes on record. Today's note will initiate this patient's medical history timeline.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {selectedPatientDetail.notes.map((n, idx) => (
                      <div
                        key={n.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2 relative"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {new Date(n.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}{' '}
                              • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {n.visitType || 'Consultation'}
                            </span>
                          </div>

                          <span className="font-bold text-slate-700 flex items-center space-x-1">
                            <Stethoscope className="w-3 h-3 text-emerald-600" />
                            <span>{n.doctorName}</span>
                          </span>
                        </div>

                        {/* Vitals summary if recorded */}
                        {n.vitals && (
                          <div className="flex items-center space-x-4 text-[11px] bg-white p-2 rounded-lg border border-slate-200 font-mono text-slate-700">
                            {n.vitals.bp && <span>BP: <strong>{n.vitals.bp}</strong></span>}
                            {n.vitals.temp && <span>Temp: <strong>{n.vitals.temp}</strong></span>}
                            {n.vitals.pulse && <span>Pulse: <strong>{n.vitals.pulse}</strong></span>}
                          </div>
                        )}

                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans pt-1">
                          {n.note}
                        </p>

                        <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1 pt-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Audit verified • Immutable record #{n.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
