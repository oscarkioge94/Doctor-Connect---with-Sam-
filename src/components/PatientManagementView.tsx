import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { Patient, PatientNote, Appointment } from '../types';
import { PatientListSkeleton, TimelineSkeleton } from './Skeletons';
import {
  Search,
  Filter,
  User,
  Calendar,
  Phone,
  FileText,
  Clock,
  History,
  Lock,
  ArrowLeft,
  X,
  Stethoscope,
  Plus
} from 'lucide-react';

export const PatientManagementView: React.FC<{
  initialPatientId?: string | null;
  onClearInitialPatient?: () => void;
}> = ({ initialPatientId, onClearInitialPatient }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Patient Detail Drawer/Modal state
  const [selectedPatient, setSelectedPatient] = useState<(Patient & { notes: PatientNote[]; appointments: Appointment[] }) | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const pts = await api.getPatients({
        query: searchQuery,
        gender: genderFilter
      });
      setPatients(pts);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, genderFilter]);

  useEffect(() => {
    if (initialPatientId) {
      handleOpenPatientDetail(initialPatientId);
    }
  }, [initialPatientId]);

  const handleOpenPatientDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await api.getPatientById(id);
      setSelectedPatient(detail);
    } catch (err) {
      console.error('Error fetching patient detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedPatient(null);
    if (onClearInitialPatient) onClearInitialPatient();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Patient Directory & Medical Records</h1>
          <p className="text-slate-500 text-sm mt-1">
            Search patient records, view demographics, and audit complete immutable medical history timelines.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="input-search-patients"
              type="text"
              placeholder="Search name, phone, national ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <select
            id="select-filter-gender"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Patient Grid / Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <PatientListSkeleton count={5} />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No patients found matching your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Patient Name & ID</th>
                  <th className="px-6 py-4">Age / Gender</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">National ID: {p.nationalId}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-semibold">{calculateAge(p.dob)}</div>
                      <div className="text-xs text-slate-500">{p.gender} • {p.dob}</div>
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-700">
                      {p.phone}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {p.lastVisitDate ? (
                        <span className="font-medium">
                          {new Date(p.lastVisitDate).toLocaleDateString('en-GB')}
                        </span>
                      ) : (
                        <span className="text-slate-400">Registered</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleOpenPatientDetail(p.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold transition-all cursor-pointer"
                      >
                        View Full Medical Record
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Detail Timeline Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                  <span className="text-xs bg-teal-500/20 text-teal-300 font-bold px-2.5 py-0.5 rounded-full border border-teal-500/30">
                    {selectedPatient.gender}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-4">
                  <span>Age: <strong>{calculateAge(selectedPatient.dob)}</strong></span>
                  <span>• DOB: <strong>{selectedPatient.dob}</strong></span>
                  <span>• ID: <strong>{selectedPatient.nationalId}</strong></span>
                  <span>• Phone: <strong>{selectedPatient.phone}</strong></span>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Medical Notes Timeline (Immutable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base font-bold text-slate-900">Clinical History Timeline (Newest First)</h3>
                </div>
                <div className="flex items-center space-x-1 text-xs text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Immutable History Safeguard</span>
                </div>
              </div>

              {selectedPatient.notes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  No previous clinical notes recorded for this patient.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedPatient.notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {new Date(note.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}{' '}
                            at {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 font-bold px-2 py-0.5 rounded">
                            {note.visitType || 'General Consultation'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          <span>Dr. {note.doctorName}</span>
                        </div>
                      </div>

                      {note.vitals && (
                        <div className="flex items-center space-x-4 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono text-slate-700">
                          {note.vitals.bp && <span>BP: <strong>{note.vitals.bp}</strong></span>}
                          {note.vitals.temp && <span>Temp: <strong>{note.vitals.temp}</strong></span>}
                          {note.vitals.pulse && <span>Pulse: <strong>{note.vitals.pulse}</strong></span>}
                        </div>
                      )}

                      <p className="text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                        {note.note}
                      </p>

                      <div className="text-[10px] text-slate-400 text-right italic pt-1">
                        Note ID: {note.id} • Old notes are append-only to preserve legal patient record history.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={handleCloseDetail}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};
