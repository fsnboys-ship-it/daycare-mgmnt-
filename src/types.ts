export type UserRole = 'admin' | 'staff' | 'parent';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  assignedChildId?: string; // For parents
  phoneNumber?: string;
  createdAt: string;
}

export interface Child {
  id: string;
  photoUrl: string;
  name: string;
  dob: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other';
  admissionDate: string; // YYYY-MM-DD
  bloodGroup: string;
  allergies: string;
  medicalNotes: string;
  parentName: string;
  parentPhone: string;
  emergencyContact: string;
}

export interface Attendance {
  id: string;
  childId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Picked Up';
  checkInTime?: string; // HH:MM AM/PM
  checkOutTime?: string; // HH:MM AM/PM
  staffId?: string;
  pickedBy?: string;

  // Daycare Logic - Firestore structure
  attendanceStatus?: 'Present' | 'Absent';
  attendanceTime?: string; // timestamp ISO string
  teacherId?: string;
  departureStatus?: 'In Center' | 'Picked Up' | 'Early Pickup' | null;
  pickupTime?: string; // timestamp ISO string
  relationship?: string;
  pickupReason?: string;
}

export interface DailyUpdate {
  id: string;
  childId: string;
  date: string; // YYYY-MM-DD
  meals: {
    breakfast: 'Completed' | 'Partial' | 'Not Eaten';
    lunch: 'Completed' | 'Partial' | 'Not Eaten';
    snacks: 'Completed' | 'Partial' | 'Not Eaten';
  };
  nap: {
    startTime: string; // HH:MM (24h or 12h) or empty
    endTime: string;
  };
  mood: 'Happy' | 'Normal' | 'Sleepy' | 'Active';
  teacherNotes: string;
  staffId: string;
  timestamp: string;
}

export type NotificationType = 'General' | 'Payment' | 'Emergency' | 'ChildSpecific';
export type TargetAudience = 'All Parents' | 'All Staff' | 'Selected Parents' | 'Selected Child';
export type NotificationPriority = 'Normal' | 'Important' | 'Urgent';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetAudience: TargetAudience;
  targetId?: string; // specific child ID or user ID if applicable
  priority: NotificationPriority;
  expiryDate?: string; // YYYY-MM-DD
  status: 'Draft' | 'Published';
  createdAt: string;
  createdBy: string;
}

export interface UserNotificationStatus {
  id: string;
  userId: string;
  notificationId: string;
  read: boolean;
  readAt?: string;
}

// Activity Log Item for the Recent Activities list
export interface ActivityLog {
  id: string;
  type: 'check_in' | 'check_out' | 'daily_update' | 'absent';
  childId: string;
  childName: string;
  childPhoto?: string;
  timestamp: string;
  details: string;
}

// Phase 2 - Fee Management
export type FeeFrequency = 'One Time' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface Fee {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  frequency: FeeFrequency;
  targetType: 'Individual' | 'Entire Class';
  targetId?: string; // Child ID or 'All'
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Online';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface Payment {
  id: string;
  feeId: string;
  feeName: string;
  childId: string;
  childName: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  receiptId?: string;
}

// Phase 2 - Pickup Authorization & Security
export interface AuthorizedPickup {
  id: string;
  childId: string;
  name: string;
  relationship: string;
  phone: string;
  idProof: string; // e.g., 'Aadhaar Card', 'PAN Card', 'Driver License'
  photoUrl?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface PickupLog {
  id: string;
  childId: string;
  childName: string;
  pickerName: string;
  relationship: string;
  verifiedById: string;
  verifiedByName: string;
  timestamp: string;
  idVerified: boolean;
  notes?: string;
}

// Phase 2 - Events & Programs
export interface DaycareEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  venue: string;
  maxSeats?: number;
  rsvpDeadline: string; // YYYY-MM-DD
  targetClass: string; // e.g., 'Toddler', 'Pre-K', 'All'
  rsvpCount: number;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  childId: string;
  childName: string;
  parentId: string;
  parentName: string;
  status: 'Yes' | 'No' | 'Undecided';
  timestamp: string;
}

// Phase 2 - Media Gallery
export interface MediaAlbum {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  coverUrl: string;
  classTag: string; // e.g., 'Toddler', 'Pre-K', 'All'
  createdAt: string;
}

export interface MediaItem {
  id: string;
  albumId: string;
  url: string;
  type: 'photo' | 'video';
  title?: string;
  uploadedAt: string;
}

// Phase 2 - Incident Reports
export type IncidentType = 'Injury' | 'Behavioral' | 'Illness' | 'Other';
export type IncidentStatus = 'Reported' | 'Under Review' | 'Resolved';

export interface IncidentReport {
  id: string;
  childId: string;
  childName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  type: IncidentType;
  location: string;
  description: string;
  actionTaken: string;
  witness: string;
  status: IncidentStatus;
  parentAcknowledged: boolean;
  parentAcknowledgeName?: string;
  parentAcknowledgeDate?: string;
}

// Phase 2 - Calendar Events
export type CalendarEventType = 'Holiday' | 'Event' | 'FeeDue' | 'Birthday' | 'Notice';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  description: string;
  targetId?: string; // Optional related item ID (e.g. feeId, eventId)
}

