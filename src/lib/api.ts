import { Patient, PatientNote, Appointment, SMSReminder, HealthStatus, ClinicStats, User } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('medflow_jwt_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('medflow_jwt_token', token);
  } else {
    localStorage.removeItem('medflow_jwt_token');
  }
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
    headers
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected server error occurred.';
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errJson.detail || errorMsg;
    } catch {
      // fallback to status text
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Health check
  checkHealth: () => request<HealthStatus>('/health'),

  // Auth
  login: async (email: string, password: string) => {
    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(res.token);
    return res;
  },

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  logout: () => {
    setAuthToken(null);
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

  createPatient: (patient: { name: string; dob: string; gender: string; phone: string; nationalId: string }) =>
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

  createAppointment: (appointment: { patientId: string; doctorId: string; datetime: string; reason: string }) =>
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
  sendSMSReminder: (appointmentId: string, customMessage?: string) =>
    request<{ success: boolean; reminder: SMSReminder; message: string }>('/reminders/send', {
      method: 'POST',
      body: JSON.stringify({ appointmentId, customMessage })
    }),

  getSMSLogs: () => request<SMSReminder[]>('/reminders/logs'),

  // Admin & Analytics
  getAdminStats: () => request<ClinicStats>('/admin/stats'),

  exportReportCSVUrl: () => `${API_BASE}/admin/export`
};
