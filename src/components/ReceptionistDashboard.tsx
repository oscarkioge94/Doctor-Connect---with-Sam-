import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Patient, Appointment, User } from '../types';
import {
  Calendar,
  Clock,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Plus,
  RefreshCw,
  Phone,
  FileCheck,
  CalendarCheck
} from 'lucide-react';

export const ReceptionistDashboard: React.FC<{ onViewPatientDetail: (id: string) => void }> = ({
  onViewPatientDetail
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00');
  const [reason, setReason] = useState('');
  const [sendSMSOnBook, setSendSMSOnBook] = useState(true);

  // Status feedback
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // New Patient Modal State
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    phone: '+2547',
    nationalId: ''
  });
  const [newPatientError, setNewPatientError] = useState<string | null>(null);

  // Search in booking modal
  const [patientSearch, setPatientSearch] = useState('');

  // Available Time Slots
  const timeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
    '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pts, docs, apts] = await Promise.all([
        api.getPatients(),
        api.getDoctors(),
        api.getAppointments({ date: bookingDate })
      ]);
      setPatients(pts);
      setDoctors(docs);
      setAppointments(apts);

      if (docs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs[0].id);
      }
      if (pts.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pts[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load receptionist data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bookingDate]);

  // Check double-booking conflict for currently selected doctor, date, and slot
  const currentSlotStr = `${bookingDate} ${selectedTimeSlot}`;
  const conflictApt = appointments.find(
    (a) =>
      a.doctorId === selectedDoctorId &&
      a.datetime === currentSlotStr &&
      a.status !== 'cancelled'
  );

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMessage(null);

    if (!selectedPatientId || !selectedDoctorId || !selectedTimeSlot || !reason.trim()) {
      setBookingMessage({ type: 'error', text: 'Please fill in all booking fields.' });
      return;
    }

    if (conflictApt) {
      setBookingMessage({
        type: 'error',
        text: 'Conflict! This doctor is already booked for this time slot. Please choose an available time.'
      });
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const createdApt = await api.createAppointment({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        datetime: currentSlotStr,
        reason: reason.trim()
      });

      // Send Africa's Talking Kenya SMS Reminder if selected
      let smsNotice = '';
      if (sendSMSOnBook) {
        try {
          const smsRes = await api.sendSMSReminder(createdApt.id);
          smsNotice = ` • ${smsRes.message}`;
        } catch (smsErr) {
          console.warn('SMS dispatch error:', smsErr);
        }
      }

      setBookingMessage({
        type: 'success',
        text: `Appointment successfully scheduled for ${currentSlotStr}!${smsNotice}`
      });

      setReason('');
      fetchData();
    } catch (err: any) {
      setBookingMessage({ type: 'error', text: err.message || 'Failed to schedule appointment.' });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPatientError(null);

    if (
      !newPatientForm.name ||
      !newPatientForm.dob ||
      !newPatientForm.phone ||
      !newPatientForm.nationalId
    ) {
      setNewPatientError('All patient fields are required.');
      return;
    }

    try {
      const created = await api.createPatient(newPatientForm);
      setPatients([created, ...patients]);
      setSelectedPatientId(created.id);
      setShowNewPatientModal(false);
      setNewPatientForm({ name: '', dob: '', gender: 'Male', phone: '+2547', nationalId: '' });
      setBookingMessage({
        type: 'success',
        text: `Patient ${created.name} registered successfully and selected for booking!`
      });
    } catch (err: any) {
      setNewPatientError(err.message || 'Failed to register new patient.');
    }
  };

  const handleQuickSMS = async (aptId: string) => {
    try {
      const res = await api.sendSMSReminder(aptId);
      alert(res.message);
      fetchData();
    } catch (err: any) {
      alert('Error sending SMS: ' + err.message);
    }
  };

  const handleStatusChange = async (aptId: string, newStatus: 'scheduled' | 'completed' | 'cancelled' | 'no-show') => {
    try {
      await api.updateAppointmentStatus(aptId, newStatus);
      fetchData();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const filteredPatientsForSelect = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch) ||
      p.nationalId.includes(patientSearch)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-sm font-semibold mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>Reception Desk & Patient Scheduling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Booking Dashboard</h1>
          <p className="text-slate-300 text-sm mt-1">
            Register new patients, manage doctor calendar availability, and send Africa's Talking Kenya SMS reminders.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="btn-open-new-patient-modal"
            onClick={() => setShowNewPatientModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Patient</span>
          </button>

          <button
            id="btn-refresh-receptionist"
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Schedule"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Booking Form (Left) vs Today Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Booking & Calendar Slot Selector */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Book Appointment</h2>
            </div>
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 font-semibold px-2.5 py-1 rounded-full">
              Conflict-Protected
            </span>
          </div>

          {bookingMessage && (
            <div
              className={`p-4 rounded-xl text-sm flex items-start space-x-3 ${
                bookingMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {bookingMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="font-medium">{bookingMessage.text}</div>
            </div>
          )}

          <form onSubmit={handleBookAppointment} className="space-y-4">
            {/* Patient Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-slate-700">Select Patient</label>
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(true)}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 underline"
                >
                  + Add New
                </button>
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Filter patient by name, phone or ID..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <select
                id="select-booking-patient"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
              >
                {filteredPatientsForSelect.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gender}, ID: {p.nationalId} • {p.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Doctor</label>
              <select
                id="select-booking-doctor"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialty || 'General Practitioner'}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Appointment Date</label>
              <input
                id="input-booking-date"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
              />
            </div>

            {/* Available Time Slots Grid */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Available Time Slot</label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                {timeSlots.map((slot) => {
                  const slotFullStr = `${bookingDate} ${slot}`;
                  const isBooked = appointments.some(
                    (a) =>
                      a.doctorId === selectedDoctorId &&
                      a.datetime === slotFullStr &&
                      a.status !== 'cancelled'
                  );

                  const isSelected = selectedTimeSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        isBooked
                          ? 'bg-slate-200 text-slate-400 border-slate-300 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Double Booking Conflict Alert if detected */}
            {conflictApt && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Time Conflict:</strong> Slot {selectedTimeSlot} is already booked for this doctor. Select a different slot above.
                </span>
              </div>
            )}

            {/* Visit Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Visit</label>
              <textarea
                id="input-booking-reason"
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chest tightness checkup, Routine BP review..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Africa's Talking Kenya SMS Reminder Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                id="checkbox-sms-reminder"
                type="checkbox"
                checked={sendSMSOnBook}
                onChange={(e) => setSendSMSOnBook(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <label htmlFor="checkbox-sms-reminder" className="text-xs font-semibold text-slate-700">
                Send SMS confirmation to patient (+254 Africa's Talking Gateway)
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-booking"
              type="submit"
              disabled={isSubmittingBooking || !!conflictApt}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              {isSubmittingBooking ? 'Scheduling...' : 'Confirm Appointment Booking'}
            </button>
          </form>
        </div>

        {/* Today's Appointments List */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clinic Schedule for {bookingDate}</h2>
              <p className="text-xs text-slate-500">
                Total Appointments: <span className="font-bold text-slate-800">{appointments.length}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
                {bookingDate === new Date().toISOString().split('T')[0] ? "Today's View" : bookingDate}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading clinic schedule...</div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No appointments scheduled for this date</h3>
              <p className="text-xs text-slate-500 mt-1">Use the booking form on the left to schedule a slot.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {appointments.map((apt) => {
                const isCompleted = apt.status === 'completed';
                const isCancelled = apt.status === 'cancelled';

                return (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : isCancelled
                        ? 'bg-red-50/40 border-red-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-teal-300 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-base">{apt.datetime.split(' ')[1]}</span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              apt.status === 'scheduled'
                                ? 'bg-amber-100 text-amber-800'
                                : apt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                          {apt.reminderSent && (
                            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                              SMS Sent
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onViewPatientDetail(apt.patientId)}
                          className="text-sm font-bold text-teal-700 hover:text-teal-900 hover:underline mt-1 text-left block"
                        >
                          {apt.patientName}
                        </button>

                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Doc: {apt.doctorName} ({apt.doctorSpecialty})</span>
                          <span>• Phone: {apt.patientPhone}</span>
                          <span>• ID: {apt.patientNationalId}</span>
                        </div>

                        <p className="text-xs text-slate-700 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{apt.reason}"
                        </p>
                      </div>

                      {/* Quick Status / Reminder Actions */}
                      <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleQuickSMS(apt.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center space-x-1 transition-all"
                          title="Send Africa's Talking Kenya SMS Reminder"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </button>

                        {apt.status === 'scheduled' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'completed')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
                          >
                            Complete
                          </button>
                        )}

                        {apt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'cancelled')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 text-xs font-semibold transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Patient Registration Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Register New Patient</h3>
              </div>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {newPatientError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {newPatientError}
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  id="new-patient-name"
                  type="text"
                  required
                  placeholder="e.g. Wanjiku Kamau"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    id="new-patient-dob"
                    type="date"
                    required
                    value={newPatientForm.dob}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    id="new-patient-gender"
                    value={newPatientForm.gender}
                    onChange={(e) =>
                      setNewPatientForm({
                        ...newPatientForm,
                        gender: e.target.value as 'Male' | 'Female' | 'Other'
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone (+254 Kenya format)</label>
                  <input
                    id="new-patient-phone"
                    type="text"
                    required
                    placeholder="+254712345678"
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">National ID / Passport</label>
                  <input
                    id="new-patient-nationalid"
                    type="text"
                    required
                    placeholder="e.g. 32098412"
                    value={newPatientForm.nationalId}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, nationalId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-new-patient"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md cursor-pointer"
                >
                  Save & Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
