export type UserRole = 'receptionist' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  specialty?: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  nationalId: string;
  createdAt: string;
  lastVisitDate?: string;
  totalVisits?: number;
}

export interface PatientNote {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  note: string;
  createdAt: string;
  visitType?: string;
  vitals?: {
    bp?: string;
    temp?: string;
    pulse?: string;
    weight?: string;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  patientDob?: string;
  patientGender?: string;
  patientNationalId?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  datetime: string; // ISO String or YYYY-MM-DD HH:mm
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notesCount?: number;
  reminderSent?: boolean;
  createdAt: string;
}

export interface SMSReminder {
  id: string;
  appointmentId: string;
  patientName: string;
  phone: string;
  message: string;
  status: 'sent' | 'failed' | 'simulated';
  responseCode: string;
  cost: string;
  sentAt: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
}

export interface ClinicStats {
  todayAppointmentsCount: number;
  completedToday: number;
  scheduledToday: number;
  totalPatients: number;
  totalDoctors: number;
  smsSentToday: number;
  dailyCounts: { date: string; count: number; completed: number }[];
  doctorWorkload: { doctorName: string; count: number }[];
}
