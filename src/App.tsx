import React, { useState, useEffect } from 'react';
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Initializing Doctor Connect...</p>
        </div>
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

      <main className="flex-1">
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
