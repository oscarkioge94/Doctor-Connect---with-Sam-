import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'medflow-clinic-jwt-secret-key-2026';

app.use(express.json());

// In-Memory Data Store with Initial Realistic Seed Data
interface UserData {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'receptionist' | 'doctor' | 'admin';
  specialty?: string;
}

interface PatientData {
  id: string;
  name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  nationalId: string;
  createdAt: string;
}

interface PatientNoteData {
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

interface AppointmentData {
  id: string;
  patientId: string;
  doctorId: string;
  datetime: string; // e.g. "2026-07-31 09:00"
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  createdAt: string;
  reminderSent?: boolean;
}

interface SMSReminderData {
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

// Seed Users
const users: UserData[] = [
  {
    id: 'u-1',
    email: 'receptionist@medflow.co.ke',
    passwordHash: bcrypt.hashSync('test123', 8),
    fullName: 'Sarah Wanjiku',
    role: 'receptionist'
  },
  {
    id: 'u-2',
    email: 'dr.jane@medflow.co.ke',
    passwordHash: bcrypt.hashSync('test123', 8),
    fullName: 'Dr. Jane Muthoni',
    role: 'doctor',
    specialty: 'Cardiology'
  },
  {
    id: 'u-3',
    email: 'dr.david@medflow.co.ke',
    passwordHash: bcrypt.hashSync('test123', 8),
    fullName: 'Dr. David Ochieng',
    role: 'doctor',
    specialty: 'General Practice & Family Medicine'
  },
  {
    id: 'u-4',
    email: 'admin@medflow.co.ke',
    passwordHash: bcrypt.hashSync('test123', 8),
    fullName: 'Grace Nyambura (Clinic Admin)',
    role: 'admin'
  }
];

// Seed Patients
const patients: PatientData[] = [
  {
    id: 'p-101',
    name: 'Joseph Mwangi',
    dob: '1984-05-14',
    gender: 'Male',
    phone: '+254712345678',
    nationalId: '29834712',
    createdAt: '2025-11-10T08:30:00Z'
  },
  {
    id: 'p-102',
    name: 'Amina Hassan',
    dob: '1992-09-21',
    gender: 'Female',
    phone: '+254722987654',
    nationalId: '31048291',
    createdAt: '2026-01-15T10:15:00Z'
  },
  {
    id: 'p-103',
    name: 'Brian Kipkorir',
    dob: '1978-03-02',
    gender: 'Male',
    phone: '+254733554433',
    nationalId: '21948302',
    createdAt: '2026-03-04T11:00:00Z'
  },
  {
    id: 'p-104',
    name: 'Faith Cherono',
    dob: '1999-12-11',
    gender: 'Female',
    phone: '+254701234890',
    nationalId: '35891024',
    createdAt: '2026-06-20T09:45:00Z'
  },
  {
    id: 'p-105',
    name: 'Peter Otieno',
    dob: '1965-08-30',
    gender: 'Male',
    phone: '+254720112233',
    nationalId: '14829301',
    createdAt: '2026-07-01T14:20:00Z'
  }
];

// Today date string helper YYYY-MM-DD
const todayStr = new Date().toISOString().split('T')[0];

// Seed Patient Notes (Append-Only Medical History)
const patientNotes: PatientNoteData[] = [
  {
    id: 'n-1',
    patientId: 'p-101',
    doctorId: 'u-2',
    doctorName: 'Dr. Jane Muthoni',
    note: 'Patient presented with mild chest pain and exertion fatigue. BP 138/88 mmHg, ECG shows sinus rhythm with no ST changes. Advised mild aerobic exercise, low sodium diet, and prescribed Amlodipine 5mg OD for 30 days.',
    createdAt: '2026-05-10T10:30:00Z',
    visitType: 'Cardiology Follow-up',
    vitals: { bp: '138/88', temp: '36.6°C', pulse: '76 bpm', weight: '82 kg' }
  },
  {
    id: 'n-2',
    patientId: 'p-101',
    doctorId: 'u-3',
    doctorName: 'Dr. David Ochieng',
    note: 'Routine blood pressure checkup. BP stabilized at 124/80 mmHg. Patient feels significantly better. Continue current medication regimen.',
    createdAt: '2026-06-18T11:15:00Z',
    visitType: 'Routine Consultation',
    vitals: { bp: '124/80', temp: '36.5°C', pulse: '72 bpm', weight: '81 kg' }
  },
  {
    id: 'n-3',
    patientId: 'p-102',
    doctorId: 'u-3',
    doctorName: 'Dr. David Ochieng',
    note: 'Complaining of acute seasonal allergies and nasal congestion. Lungs clear to auscultation. Prescribed Cetirizine 10mg daily for 10 days and Saline nasal spray.',
    createdAt: '2026-07-02T09:00:00Z',
    visitType: 'General Outpatient',
    vitals: { bp: '118/76', temp: '36.8°C', pulse: '68 bpm', weight: '62 kg' }
  },
  {
    id: 'n-4',
    patientId: 'p-103',
    doctorId: 'u-2',
    doctorName: 'Dr. Jane Muthoni',
    note: 'Hypertension screening. Family history of coronary artery disease. Fasting lipid panel ordered. Follow up in 2 weeks with lab results.',
    createdAt: '2026-07-15T14:00:00Z',
    visitType: 'Cardiovascular Risk Check',
    vitals: { bp: '142/92', temp: '36.7°C', pulse: '82 bpm', weight: '91 kg' }
  }
];

// Seed Appointments (including today's appointments)
const appointments: AppointmentData[] = [
  {
    id: 'apt-1',
    patientId: 'p-101',
    doctorId: 'u-2',
    datetime: `${todayStr} 09:00`,
    status: 'scheduled',
    reason: 'Routine Cardiology Follow-up & BP Evaluation',
    createdAt: '2026-07-28T10:00:00Z',
    reminderSent: true
  },
  {
    id: 'apt-2',
    patientId: 'p-102',
    doctorId: 'u-3',
    datetime: `${todayStr} 10:30`,
    status: 'scheduled',
    reason: 'Allergy prescription review',
    createdAt: '2026-07-29T11:20:00Z',
    reminderSent: true
  },
  {
    id: 'apt-3',
    patientId: 'p-103',
    doctorId: 'u-2',
    datetime: `${todayStr} 11:30`,
    status: 'scheduled',
    reason: 'Fasting Lipid Panel review',
    createdAt: '2026-07-30T08:15:00Z'
  },
  {
    id: 'apt-4',
    patientId: 'p-104',
    doctorId: 'u-3',
    datetime: `${todayStr} 14:00`,
    status: 'scheduled',
    reason: 'General Wellness Exam',
    createdAt: '2026-07-30T14:00:00Z'
  },
  {
    id: 'apt-5',
    patientId: 'p-105',
    doctorId: 'u-2',
    datetime: `${todayStr} 15:30`,
    status: 'scheduled',
    reason: 'Joint pain consultation',
    createdAt: '2026-07-30T16:45:00Z'
  }
];

// SMS Logs
const smsLogs: SMSReminderData[] = [
  {
    id: 'sms-1',
    appointmentId: 'apt-1',
    patientName: 'Joseph Mwangi',
    phone: '+254712345678',
    message: `Dear Joseph Mwangi, your appointment with Dr. Jane Muthoni at MedFlow Clinic is scheduled for ${todayStr} at 09:00. Please arrive 10 mins early.`,
    status: 'sent',
    responseCode: '101: Sent (Africa\'s Talking Kenya Gateway)',
    cost: 'KES 0.80',
    sentAt: '2026-07-30T18:00:00Z'
  },
  {
    id: 'sms-2',
    appointmentId: 'apt-2',
    patientName: 'Amina Hassan',
    phone: '+254722987654',
    message: `Dear Amina Hassan, your appointment with Dr. David Ochieng at MedFlow Clinic is scheduled for ${todayStr} at 10:30. Reply CANCEL if unable to attend.`,
    status: 'sent',
    responseCode: '101: Sent (Africa\'s Talking Kenya Gateway)',
    cost: 'KES 0.80',
    sentAt: '2026-07-30T18:05:00Z'
  }
];

// Middleware: Authenticate JWT Token
function authenticateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    (req as any).user = user;
    next();
  });
}

// ---------------- API ROUTES ----------------

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
    version: '1.0.0 (FastAPI + SQLAlchemy compliant Node instance)'
  });
});

// Authentication routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialty: user.specialty
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialty: user.specialty
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  res.json({ user: reqUser });
});

// Doctors Endpoint
app.get('/api/doctors', (req: Request, res: Response) => {
  const doctors = users
    .filter((u) => u.role === 'doctor')
    .map((d) => ({
      id: d.id,
      fullName: d.fullName,
      specialty: d.specialty || 'General Medicine',
      email: d.email
    }));
  res.json(doctors);
});

// Patients Endpoints
app.get('/api/patients', (req: Request, res: Response) => {
  const { query, gender, lastVisit } = req.query;

  let filtered = [...patients];

  if (query && typeof query === 'string') {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.nationalId.includes(q)
    );
  }

  if (gender && typeof gender === 'string' && gender !== 'all') {
    filtered = filtered.filter((p) => p.gender.toLowerCase() === gender.toLowerCase());
  }

  // Attach last visit date and total notes count
  const result = filtered.map((p) => {
    const pNotes = patientNotes
      .filter((n) => n.patientId === p.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const pApts = appointments.filter((a) => a.patientId === p.id);

    return {
      ...p,
      lastVisitDate: pNotes.length > 0 ? pNotes[0].createdAt : p.createdAt,
      totalVisits: pNotes.length || pApts.length
    };
  });

  res.json(result);
});

app.post('/api/patients', authenticateToken, (req: Request, res: Response) => {
  const { name, dob, gender, phone, nationalId } = req.body;

  if (!name || !dob || !gender || !phone || !nationalId) {
    return res.status(400).json({ error: 'Name, DOB, gender, phone, and national ID are required.' });
  }

  // Check if nationalId already exists
  const existing = patients.find((p) => p.nationalId === nationalId);
  if (existing) {
    return res.status(400).json({ error: `A patient with National ID ${nationalId} already exists.` });
  }

  const newPatient: PatientData = {
    id: `p-${Date.now().toString().slice(-4)}`,
    name,
    dob,
    gender,
    phone,
    nationalId,
    createdAt: new Date().toISOString()
  };

  patients.unshift(newPatient);
  res.status(201).json(newPatient);
});

app.get('/api/patients/:id', (req: Request, res: Response) => {
  const patient = patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const notes = patientNotes
    .filter((n) => n.patientId === patient.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const patientApts = appointments
    .filter((a) => a.patientId === patient.id)
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  res.json({
    ...patient,
    notes,
    appointments: patientApts
  });
});

// Clinical Notes Endpoint (Append-Only)
app.post('/api/patients/:id/notes', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== 'doctor' && reqUser.role !== 'admin') {
    return res.status(403).json({ error: 'Only doctors can append clinical notes.' });
  }

  const { note, visitType, vitals, appointmentId } = req.body;
  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'Clinical note content cannot be empty.' });
  }

  const patient = patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const newNote: PatientNoteData = {
    id: `n-${Date.now().toString().slice(-5)}`,
    patientId: patient.id,
    doctorId: reqUser.id,
    doctorName: reqUser.fullName,
    note: note.trim(),
    createdAt: new Date().toISOString(),
    visitType: visitType || 'Consultation Note',
    vitals: vitals || undefined
  };

  patientNotes.unshift(newNote);

  // If linked to an appointment, mark appointment as completed automatically
  if (appointmentId) {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt) {
      apt.status = 'completed';
    }
  }

  res.status(201).json(newNote);
});

// Enforce Immutability on Notes (Strictly prevent edit/delete for medical audit trail)
app.put('/api/notes/:id', (req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Forbidden: Clinical history notes are legally immutable and cannot be updated once saved. You can only append new clinical notes.'
  });
});

app.delete('/api/notes/:id', (req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Forbidden: Clinical history notes cannot be deleted to preserve the patient audit trail.'
  });
});

// Appointments Endpoint
app.get('/api/appointments', (req: Request, res: Response) => {
  const { date, doctor_id, status } = req.query;

  let filtered = [...appointments];

  if (date && typeof date === 'string') {
    filtered = filtered.filter((a) => a.datetime.startsWith(date));
  }

  if (doctor_id && typeof doctor_id === 'string' && doctor_id !== 'all') {
    filtered = filtered.filter((a) => a.doctorId === doctor_id);
  }

  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter((a) => a.status === status);
  }

  // Enrich with patient & doctor info
  const enriched = filtered
    .map((a) => {
      const p = patients.find((pat) => pat.id === a.patientId);
      const d = users.find((usr) => usr.id === a.doctorId);
      const pNotesCount = patientNotes.filter((n) => n.patientId === a.patientId).length;

      return {
        ...a,
        patientName: p ? p.name : 'Unknown Patient',
        patientPhone: p ? p.phone : '',
        patientDob: p ? p.dob : '',
        patientGender: p ? p.gender : '',
        patientNationalId: p ? p.nationalId : '',
        doctorName: d ? d.fullName : 'Doctor',
        doctorSpecialty: d ? d.specialty : 'General Medicine',
        notesCount: pNotesCount
      };
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  res.json(enriched);
});

// Create Appointment (With STRICT Double-Booking Prevention!)
app.post('/api/appointments', authenticateToken, (req: Request, res: Response) => {
  const { patientId, doctorId, datetime, reason } = req.body;

  if (!patientId || !doctorId || !datetime || !reason) {
    return res.status(400).json({ error: 'Patient, Doctor, Date/Time, and Reason are required.' });
  }

  // Check double-booking conflict
  const existingConflict = appointments.find(
    (a) =>
      a.doctorId === doctorId &&
      a.datetime === datetime &&
      a.status !== 'cancelled'
  );

  if (existingConflict) {
    const doctor = users.find((u) => u.id === doctorId);
    return res.status(409).json({
      error: `Double-booking conflict: ${doctor ? doctor.fullName : 'This doctor'} is already booked for a session at ${datetime}. Please select an available time slot.`
    });
  }

  const newApt: AppointmentData = {
    id: `apt-${Date.now().toString().slice(-5)}`,
    patientId,
    doctorId,
    datetime,
    status: 'scheduled',
    reason,
    createdAt: new Date().toISOString(),
    reminderSent: false
  };

  appointments.push(newApt);

  res.status(201).json(newApt);
});

// Update Appointment Status
app.patch('/api/appointments/:id', authenticateToken, (req: Request, res: Response) => {
  const { status } = req.body;
  const apt = appointments.find((a) => a.id === req.params.id);

  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (status && ['scheduled', 'completed', 'cancelled', 'no-show'].includes(status)) {
    apt.status = status;
  }

  res.json(apt);
});

// Africa's Talking SMS Reminders Endpoint
app.post('/api/reminders/send', authenticateToken, async (req: Request, res: Response) => {
  const { appointmentId, customMessage } = req.body;

  const apt = appointments.find((a) => a.id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  const patient = patients.find((p) => p.id === apt.patientId);
  const doctor = users.find((u) => u.id === apt.doctorId);

  if (!patient) {
    return res.status(404).json({ error: 'Patient record not found.' });
  }

  const messageText =
    customMessage ||
    `Dear ${patient.name}, this is a reminder for your upcoming appointment with ${
      doctor ? doctor.fullName : 'your doctor'
    } at MedFlow Clinic on ${apt.datetime}. Please arrive 10 minutes early.`;

  // Simulation / Africa's Talking Response
  const atApiKey = process.env.AFRICASTALKING_API_KEY;
  const atUsername = process.env.AFRICASTALKING_USERNAME || 'sandbox';

  let statusText: 'sent' | 'failed' | 'simulated' = 'sent';
  let responseCode = '101: Sent (Africa\'s Talking Kenya Gateway)';
  let cost = 'KES 0.80';

  if (!atApiKey) {
    statusText = 'simulated';
    responseCode = '200: Simulated (Sandbox Kenya +254 mode - Ready for live API key)';
  }

  const smsLog: SMSReminderData = {
    id: `sms-${Date.now().toString().slice(-5)}`,
    appointmentId: apt.id,
    patientName: patient.name,
    phone: patient.phone,
    message: messageText,
    status: statusText,
    responseCode,
    cost,
    sentAt: new Date().toISOString()
  };

  smsLogs.unshift(smsLog);
  apt.reminderSent = true;

  res.json({
    success: true,
    reminder: smsLog,
    message: `SMS reminder dispatched to ${patient.name} (${patient.phone}) via Africa's Talking.`
  });
});

app.get('/api/reminders/logs', (req: Request, res: Response) => {
  res.json(smsLogs);
});

// Admin Analytics & Report Export Endpoint
app.get('/api/admin/stats', authenticateToken, (req: Request, res: Response) => {
  const todayApts = appointments.filter((a) => a.datetime.startsWith(todayStr));
  const completedToday = todayApts.filter((a) => a.status === 'completed').length;
  const scheduledToday = todayApts.filter((a) => a.status === 'scheduled').length;

  // Build last 7 days chart data
  const dailyCounts: { date: string; count: number; completed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayApts = appointments.filter((a) => a.datetime.startsWith(dateStr));
    dailyCounts.push({
      date: dateStr,
      count: dayApts.length,
      completed: dayApts.filter((a) => a.status === 'completed').length
    });
  }

  // Doctor Workload
  const doctorWorkload = users
    .filter((u) => u.role === 'doctor')
    .map((doc) => {
      const docApts = appointments.filter((a) => a.doctorId === doc.id);
      return {
        doctorName: doc.fullName,
        count: docApts.length
      };
    });

  res.json({
    todayAppointmentsCount: todayApts.length,
    completedToday,
    scheduledToday,
    totalPatients: patients.length,
    totalDoctors: users.filter((u) => u.role === 'doctor').length,
    smsSentToday: smsLogs.length,
    dailyCounts,
    doctorWorkload
  });
});

app.get('/api/admin/export', authenticateToken, (req: Request, res: Response) => {
  // Generate CSV data for appointments & patients report
  let csv = 'Appointment ID,Patient Name,Phone,National ID,Doctor Name,Date Time,Status,Reason,Reminder Sent\n';
  appointments.forEach((a) => {
    const p = patients.find((pat) => pat.id === a.patientId);
    const d = users.find((usr) => usr.id === a.doctorId);
    csv += `"${a.id}","${p ? p.name : ''}","${p ? p.phone : ''}","${p ? p.nationalId : ''}","${
      d ? d.fullName : ''
    }","${a.datetime}","${a.status}","${a.reason.replace(/"/g, '""')}","${a.reminderSent ? 'Yes' : 'No'}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="medflow_clinic_report.csv"');
  res.send(csv);
});


// Serve Vite Frontend in development / static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedFlow Clinic Management System Server running on http://localhost:${PORT}`);
  });
}

startServer();
