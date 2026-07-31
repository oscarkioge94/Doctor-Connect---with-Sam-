export type UserRole = 'receptionist' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  specialty?: string;
  phone?: string;
  lastLoginAt?: string;
  isCurrentlyActive?: boolean;
}

export interface LoginInitResponse {
  requires2FA: boolean;
  pendingToken: string;
  userId: string;
  maskedPhone: string | null;
  maskedEmail: string | null;
  availableMethods: string[];
  defaultMethod: string;
}

export interface LoginEvent {
  id: string;
  userId?: string;
  userName?: string;
  email: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  timestamp: string;
  relativeTime: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  createdAt: string;
  relativeTime: string;
  description: string;
}

export interface Patient {
  id: string;
  fullName?: string;
  name?: string;
  dob: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  nationalId: string;
  email?: string;
  bloodType?: string;
  allergies?: string;
  preExistingConditions?: string;
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
  datetimeSlot?: string;
  datetime?: string; // ISO String or YYYY-MM-DD HH:mm
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notes?: string;
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
  status: 'sent' | 'failed' | 'simulated' | 'delivered';
  responseCode?: string;
  provider?: string;
  cost?: string;
  sentAt: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
}

export interface ClinicStats {
  todayAppointments: number;
  completedAppointments: number;
  totalPatients: number;
  totalRemindersSent: number;
}
