import {
  Patient, PatientNote, Appointment, SMSReminder, HealthStatus, ClinicStats, User,
  LoginInitResponse, LoginEvent, AuditLogEntry
} from '../types';

const API_BASE = '/api';

// Access token stored purely IN MEMORY (not localStorage) as required in Stage 1
let inMemoryAccessToken: string | null = null;

export function getAuthToken(): string | null {
  return inMemoryAccessToken;
}

export function setAuthToken(token: string | null): void {
  inMemoryAccessToken = token;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // Transmit httpOnly refresh_token cookie
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected server error occurred.';
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.error || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Health check
  checkHealth: () => request<HealthStatus>('/health'),

  // Auth Stage 1 & Stage 2 & 2FA
  loginInit: (email: string, pass: string) =>
    request<LoginInitResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    }),

  send2FACode: (pendingToken: string, method: string) =>
    request<{ success: boolean; message: string }>('/auth/2fa/send', {
      method: 'POST',
      body: JSON.stringify({ pendingToken, method })
    }),

  verify2FA: async (pendingToken: string, code: string) => {
    const res = await request<{ token: string; user: User }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ pendingToken, code })
    });
    setAuthToken(res.token);
    return res;
  },

  refreshToken: async () => {
    try {
      const res = await request<{ token: string; user: User }>('/auth/refresh', {
        method: 'POST'
      });
      setAuthToken(res.token);
      return res;
    } catch (err) {
      setAuthToken(null);
      throw err;
    }
  },

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  logout: async () => {
    try {
      await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network failures on logout
    } finally {
      setAuthToken(null);
    }
  },

  // Google OAuth
  getGoogleLoginUrl: () => request<{ url: string }>('/auth/google/login'),

  googleVerify: (email: string) =>
    request<LoginInitResponse>('/auth/google/verify', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  // Staff Self Service (My Account 2FA update)
  updateMyContactInfo: (data: { currentPassword: string; phone?: string; email?: string }) =>
    request<{ success: boolean; message: string; user: User }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Admin Endpoints
  getAdminUsers: () => request<User[]>('/admin/users'),

  createAdminUser: (data: { email: string; fullName: string; role: string; specialty?: string; phone?: string; password: string }) =>
    request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getLoginEvents: (userId?: string, page: number = 1, limit: number = 20) => {
    const search = new URLSearchParams();
    if (userId) search.append('user_id', userId);
    search.append('page', page.toString());
    search.append('limit', limit.toString());
    return request<{ items: LoginEvent[]; total: number; page: number; limit: number }>(`/admin/logins?${search.toString()}`);
  },

  getAuditLogs: (userId?: string, page: number = 1, limit: number = 20) => {
    const search = new URLSearchParams();
    if (userId) search.append('user_id', userId);
    search.append('page', page.toString());
    search.append('limit', limit.toString());
    return request<{ items: AuditLogEntry[]; total: number; page: number; limit: number }>(`/admin/audit-logs?${search.toString()}`);
  },

  // Doctors
  getDoctors: () => request<User[]>('/doctors'),

  // Patients
  getPatients: (params?: { query?: string; gender?: string; lastVisit?: string }) => {
    const search = new URLSearchParams();
    if (params?.query) search.append('query', params.query);
    if (params?.gender) search.append('gender', params.gender);
    if (params?.lastVisit) search.append('lastVisit', params.lastVisit);

    const queryStr = search.toString();
    return request<Patient[]>(`/patients${queryStr ? `?${queryStr}` : ''}`);
  },

  getPatientById: (id: string) => request<Patient & { notes: PatientNote[]; appointments: Appointment[] }>(`/patients/${id}`),

  createPatient: (patient: { full_name: string; dob: string; gender: string; phone: string; national_id: string; email?: string; blood_type?: string; allergies?: string; pre_existing_conditions?: string }) =>
    request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient)
    }),

  // Append Clinical Note
  appendClinicalNote: (patientId: string, data: { note: string; visitType?: string; vitals?: any; appointmentId?: string }) =>
    request<PatientNote>(`/patients/${patientId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Appointments
  getAppointments: (params?: { date?: string; doctor_id?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.date) search.append('date', params.date);
    if (params?.doctor_id) search.append('doctor_id', params.doctor_id);
    if (params?.status) search.append('status', params.status);

    const queryStr = search.toString();
    return request<Appointment[]>(`/appointments${queryStr ? `?${queryStr}` : ''}`);
  },

  createAppointment: (appointment: { patient_id: string; doctor_id: string; datetime_slot: string; reason: string }) =>
    request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment)
    }),

  updateAppointmentStatus: (id: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no-show') =>
    request<Appointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  // Reminders
  sendSMSReminder: (appointmentId: string) =>
    request<{ success: boolean; message: string; log: SMSReminder }>('/reminders/send', {
      method: 'POST',
      body: JSON.stringify({ appointment_id: appointmentId })
    }),

  getSMSLogs: () => request<SMSReminder[]>('/reminders/logs'),

  // Admin & Analytics
  getAdminStats: () => request<ClinicStats>('/admin/stats'),

  exportReportCSVUrl: () => `${API_BASE}/admin/export`
};
