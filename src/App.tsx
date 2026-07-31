import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Stethoscope } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { TopNav } from './components/TopNav';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientManagementView } from './components/PatientManagementView';
import { RemindersPortalView } from './components/RemindersPortalView';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './lib/api';

function MainContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('');
  const [healthConnected, setHealthConnected] = useState<boolean>(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<string | null>(null);

  // Check backend health status
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const health = await api.checkHealth();
        if (health.status === 'ok') {
          setHealthConnected(true);
        }
      } catch (err) {
        console.warn('Backend API connection pending:', err);
        setHealthConnected(false);
      }
    };

    checkApiHealth();
    const interval = setInterval(checkApiHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Set initial active tab based on user role when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === 'receptionist') setActiveTab('receptionist');
      else if (user.role === 'doctor') setActiveTab('doctor');
      else if (user.role === 'admin') setActiveTab('admin');
      else setActiveTab('patients');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center text-white space-y-4 max-w-xs"
        >
          <div className="relative inline-flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-lg"
            />
            <div className="relative w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl border border-teal-400/30">
              <Activity className="w-9 h-9" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">Doctor Connect</h1>
            <p className="text-xs text-teal-400/90 font-mono mt-0.5">Healthcare Clinic OS</p>
          </div>
          <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 pt-2">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            >
              Initializing clinic session
            </motion.span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            >
              •
            </motion.span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            >
              Syncing
            </motion.span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigateToPatientDetail = (patientId: string) => {
    setSelectedPatientForDetail(patientId);
    setActiveTab('patients');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-900 flex flex-col antialiased">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} healthConnected={healthConnected} />

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full"
          >
            {activeTab === 'receptionist' && (
              <ReceptionistDashboard onViewPatientDetail={handleNavigateToPatientDetail} />
            )}

            {activeTab === 'doctor' && <DoctorDashboard />}

            {activeTab === 'patients' && (
              <PatientManagementView
                initialPatientId={selectedPatientForDetail}
                onClearInitialPatient={() => setSelectedPatientForDetail(null)}
              />
            )}

            {activeTab === 'reminders' && <RemindersPortalView />}

            {activeTab === 'admin' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 px-4 text-center space-y-1">
        <p className="font-semibold text-slate-300">Doctor Connect Healthcare Clinic OS v1.0.0</p>
        <p className="text-slate-500">
          FastAPI & SQLAlchemy Compliant • PostgreSQL Schema • Africa's Talking Kenya Gateway (+254) • Immutable Medical Audit Trail
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
