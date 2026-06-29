import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  UserProfile, 
  Child, 
  Attendance, 
  DailyUpdate, 
  NotificationItem, 
  UserNotificationStatus, 
  ActivityLog,
  UserRole,
  Fee,
  Payment,
  AuthorizedPickup,
  PickupLog,
  DaycareEvent,
  EventRegistration,
  MediaAlbum,
  MediaItem,
  IncidentReport,
  CalendarEvent,
  PaymentMethod,
  PaymentStatus
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const auth = firebaseAuth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Let's check if there is a Firebase config available
// If not, we will use our robust localStorage adapter
let useFirebaseReal = false;
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firestoreDb: any = null;
let firebaseStorage: any = null;

const firebaseConfigEnv = (import.meta as any).env?.VITE_FIREBASE_CONFIG || '';

try {
  if (firebaseConfigEnv) {
    const config = JSON.parse(firebaseConfigEnv);
    if (config.apiKey && config.projectId) {
      firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
      firebaseAuth = getAuth(firebaseApp);
      firestoreDb = getFirestore(firebaseApp);
      firebaseStorage = getStorage(firebaseApp);
      useFirebaseReal = true;
      console.log('Firebase successfully initialized in REAL mode.');
    }
  }
} catch (error) {
  console.warn('Firebase failed to initialize in REAL mode. Falling back to local storage sandbox.', error);
}

// -------------------------------------------------------------
// LOCAL STORAGE DATA SEEDING (Saves automatically to localStorage)
// -------------------------------------------------------------

const DEFAULT_USERS: UserProfile[] = [
  {
    uid: 'admin-user-id',
    email: 'admin@aangan.app',
    name: 'Centre Admin',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'staff-user-id',
    email: 'staff@aangan.app',
    name: 'Staff Member',
    role: 'staff',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'parent-user-id',
    email: 'parent@aangan.app',
    name: 'Parent User',
    role: 'parent',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_CHILDREN: Child[] = [];

const DEFAULT_ATTENDANCE: Attendance[] = [];

const DEFAULT_DAILY_UPDATES: DailyUpdate[] = [];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

const DEFAULT_USER_NOTIFICATIONS: UserNotificationStatus[] = [];

// Phase 2 - Fee Management Defaults
const DEFAULT_FEES: Fee[] = [];

const DEFAULT_PAYMENTS: Payment[] = [];

// Phase 2 - Pickup Authorization Defaults
const DEFAULT_AUTHORIZED_PICKUPS: AuthorizedPickup[] = [];

const DEFAULT_PICKUP_LOGS: PickupLog[] = [];

// Phase 2 - Daycare Events Defaults
const DEFAULT_EVENTS: DaycareEvent[] = [];

const DEFAULT_EVENT_REGISTRATIONS: EventRegistration[] = [];

// Phase 2 - Media Gallery Defaults
const DEFAULT_ALBUMS: MediaAlbum[] = [];

const DEFAULT_MEDIA: MediaItem[] = [];

// Phase 2 - Incident Reports Defaults
const DEFAULT_INCIDENT_REPORTS: IncidentReport[] = [];

// Phase 2 - Calendar Schedules Defaults
const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [];

// Helper to initialize local storage safely
function getStored<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
}

// Force reset for users wanting a clean slate
if (localStorage.getItem('aangan_data_v4_reset') !== 'true') {
  localStorage.removeItem('aangan_attendance');
  localStorage.removeItem('aangan_daily_updates');
  localStorage.removeItem('aangan_notifications');
  localStorage.removeItem('aangan_user_notifications');
  localStorage.removeItem('aangan_fees');
  localStorage.removeItem('aangan_payments');
  localStorage.removeItem('aangan_authorized_pickups');
  localStorage.removeItem('aangan_pickup_logs');
  localStorage.removeItem('aangan_events');
  localStorage.removeItem('aangan_event_registrations');
  localStorage.removeItem('aangan_albums');
  localStorage.removeItem('aangan_media');
  localStorage.removeItem('aangan_incidents');
  localStorage.removeItem('aangan_calendar_events');
  localStorage.setItem('aangan_data_v4_reset', 'true');
}

// Ensure local storage is seeded if empty
if (!localStorage.getItem('aangan_users')) setStored('aangan_users', DEFAULT_USERS);
if (!localStorage.getItem('aangan_children')) setStored('aangan_children', DEFAULT_CHILDREN);
if (!localStorage.getItem('aangan_attendance')) setStored('aangan_attendance', DEFAULT_ATTENDANCE);
if (!localStorage.getItem('aangan_daily_updates')) setStored('aangan_daily_updates', DEFAULT_DAILY_UPDATES);
if (!localStorage.getItem('aangan_notifications')) setStored('aangan_notifications', DEFAULT_NOTIFICATIONS);
if (!localStorage.getItem('aangan_user_notifications')) setStored('aangan_user_notifications', DEFAULT_USER_NOTIFICATIONS);

// Phase 2 Seeding
if (!localStorage.getItem('aangan_fees')) setStored('aangan_fees', DEFAULT_FEES);
if (!localStorage.getItem('aangan_payments')) setStored('aangan_payments', DEFAULT_PAYMENTS);
if (!localStorage.getItem('aangan_authorized_pickups')) setStored('aangan_authorized_pickups', DEFAULT_AUTHORIZED_PICKUPS);
if (!localStorage.getItem('aangan_pickup_logs')) setStored('aangan_pickup_logs', DEFAULT_PICKUP_LOGS);
if (!localStorage.getItem('aangan_events')) setStored('aangan_events', DEFAULT_EVENTS);
if (!localStorage.getItem('aangan_event_registrations')) setStored('aangan_event_registrations', DEFAULT_EVENT_REGISTRATIONS);
if (!localStorage.getItem('aangan_albums')) setStored('aangan_albums', DEFAULT_ALBUMS);
if (!localStorage.getItem('aangan_media')) setStored('aangan_media', DEFAULT_MEDIA);
if (!localStorage.getItem('aangan_incidents')) setStored('aangan_incidents', DEFAULT_INCIDENT_REPORTS);
if (!localStorage.getItem('aangan_calendar_events')) setStored('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);

// Track active log-in in mock mode
let mockCurrentUser: UserProfile | null = getStored<UserProfile | null>('aangan_mock_user', null);

// Custom subscribers list for real-time updates simulation
type CallbackType = () => void;
const dbListeners: { [collection: string]: CallbackType[] } = {
  children: [],
  attendance: [],
  daily_updates: [],
  notifications: [],
  user_notifications: [],
  activities: [],
  fees: [],
  payments: [],
  authorized_pickups: [],
  pickup_logs: [],
  events: [],
  event_registrations: [],
  albums: [],
  media: [],
  incident_reports: [],
  calendar_events: []
};

function notifyListeners(col: string) {
  if (dbListeners[col]) {
    dbListeners[col].forEach(cb => cb());
  } else {
    // Initialize on-the-fly for any collection not pre-declared
    dbListeners[col] = [];
  }
}

// -------------------------------------------------------------
// CORE DB AND AUTH SERVICE LAYER APIS
// -------------------------------------------------------------

export const dbService = {
  isRealFirebase: () => useFirebaseReal,

  // --- Auth APIs ---
  getCurrentUser: (): UserProfile | null => {
    return mockCurrentUser;
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    if (useFirebaseReal && firebaseAuth) {
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const userDocRef = doc(firestoreDb, 'users', cred.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          return userDoc.data() as UserProfile;
        } else {
          // If profile does not exist, check if we can make a default fallback
          throw new Error('User profile not found in database.');
        }
      } catch (err: any) {
        throw new Error(err.message || 'Authentication failed');
      }
    } else {
      // Local mock login
      const users = getStored<UserProfile[]>('aangan_users', DEFAULT_USERS);
      const matched = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (matched) {
        // Any simple password matches for our mock users
        mockCurrentUser = matched;
        setStored('aangan_mock_user', matched);
        return matched;
      } else {
        throw new Error('Invalid email or password.');
      }
    }
  },

  logout: async (): Promise<void> => {
    if (useFirebaseReal && firebaseAuth) {
      await signOut(firebaseAuth);
    }
    mockCurrentUser = null;
    localStorage.removeItem('aangan_mock_user');
  },

  // --- Children Management ---
  getChildren: async (): Promise<Child[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'children'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Child);
    } else {
      return getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
    }
  },

  getChildById: async (id: string): Promise<Child | null> => {
    if (useFirebaseReal && firestoreDb) {
      const d = await getDoc(doc(firestoreDb, 'children', id));
      return d.exists() ? ({ id: d.id, ...d.data() } as Child) : null;
    } else {
      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      return children.find(c => c.id === id) || null;
    }
  },

  createChild: async (childData: Omit<Child, 'id'>): Promise<Child> => {
    const id = useFirebaseReal && firestoreDb ? doc(collection(firestoreDb, 'children')).id : 'child-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newChild: Child = { ...childData, id };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'children', id), newChild);
    } else {
      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      children.push(newChild);
      setStored('aangan_children', children);
      notifyListeners('children');
    }
    return newChild;
  },

  updateChild: async (id: string, childData: Partial<Child>): Promise<Child> => {
    if (useFirebaseReal && firestoreDb) {
      const ref = doc(firestoreDb, 'children', id);
      await updateDoc(ref, childData as any);
      const updated = await getDoc(ref);
      return { id: updated.id, ...updated.data() } as Child;
    } else {
      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      const idx = children.findIndex(c => c.id === id);
      if (idx !== -1) {
        children[idx] = { ...children[idx], ...childData };
        setStored('aangan_children', children);
        notifyListeners('children');
        return children[idx];
      }
      throw new Error('Child not found');
    }
  },

  deleteChild: async (id: string): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'children', id));
    } else {
      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      const updated = children.filter(c => c.id !== id);
      setStored('aangan_children', updated);
      notifyListeners('children');
    }
  },

  // --- Attendance ---
  getAttendanceForDate: async (date: string): Promise<Attendance[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'attendance'), where('date', '==', date));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Attendance);
    } else {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      return att.filter(a => a.date === date);
    }
  },

  getAttendanceHistoryForChild: async (childId: string): Promise<Attendance[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'attendance'), where('childId', '==', childId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Attendance);
    } else {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      return att.filter(a => a.childId === childId).sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  checkIn: async (childId: string, checkInTime: string, staffId: string): Promise<Attendance> => {
    const date = new Date().toISOString().split('T')[0];
    if (useFirebaseReal && firestoreDb) {
      // Real firebase implementation
      const id = `${childId}_${date}`;
      const docRef = doc(firestoreDb, 'attendance', id);
      const attData: Attendance = {
        id,
        childId,
        date,
        status: 'Present',
        checkInTime,
        staffId
      };
      await setDoc(docRef, attData);
      
      // Also write dynamic activity log to Firestore
      await addDoc(collection(firestoreDb, 'activities'), {
        type: 'check_in',
        childId,
        timestamp: new Date().toISOString(),
        details: 'Checked In at ' + checkInTime
      });

      return attData;
    } else {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      const existingIdx = att.findIndex(a => a.childId === childId && a.date === date);
      const id = 'att-' + Date.now();
      
      const newRecord: Attendance = {
        id: existingIdx !== -1 ? att[existingIdx].id : id,
        childId,
        date,
        status: 'Present',
        checkInTime,
        staffId
      };

      if (existingIdx !== -1) {
        att[existingIdx] = newRecord;
      } else {
        att.push(newRecord);
      }
      setStored('aangan_attendance', att);

      // Trigger Activity Log
      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      const c = children.find(ch => ch.id === childId);
      logActivity({
        id: 'act-' + Date.now(),
        type: 'check_in',
        childId,
        childName: c ? c.name : 'Unknown Child',
        childPhoto: c?.photoUrl,
        timestamp: new Date().toISOString(),
        details: `${c ? c.name : 'Child'} checked in at ${checkInTime}.`
      });

      // Send Push notification trigger
      triggerPushNotification(`Child Checked In`, `${c ? c.name : 'Your child'} has been checked in today at ${checkInTime}.`);

      notifyListeners('attendance');
      return newRecord;
    }
  },

  checkOut: async (childId: string, checkOutTime: string, pickedBy: string): Promise<Attendance> => {
    const date = new Date().toISOString().split('T')[0];
    if (useFirebaseReal && firestoreDb) {
      const id = `${childId}_${date}`;
      const docRef = doc(firestoreDb, 'attendance', id);
      const current = await getDoc(docRef);
      const existingData = current.exists() ? current.data() as Attendance : { id, childId, date };
      
      const attData: Attendance = {
        ...existingData,
        status: 'Picked Up',
        checkOutTime,
        pickedBy
      } as Attendance;
      
      await setDoc(docRef, attData);
      return attData;
    } else {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      const existingIdx = att.findIndex(a => a.childId === childId && a.date === date);
      
      const updatedRecord: Attendance = {
        id: existingIdx !== -1 ? att[existingIdx].id : 'att-' + Date.now(),
        childId,
        date,
        status: 'Picked Up',
        checkInTime: existingIdx !== -1 ? att[existingIdx].checkInTime : '09:00 AM', // Default fallback
        checkOutTime,
        pickedBy,
        staffId: existingIdx !== -1 ? att[existingIdx].staffId : 'staff-user-id'
      };

      if (existingIdx !== -1) {
        att[existingIdx] = updatedRecord;
      } else {
        att.push(updatedRecord);
      }
      setStored('aangan_attendance', att);

      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      const c = children.find(ch => ch.id === childId);
      logActivity({
        id: 'act-' + Date.now(),
        type: 'check_out',
        childId,
        childName: c ? c.name : 'Unknown Child',
        childPhoto: c?.photoUrl,
        timestamp: new Date().toISOString(),
        details: `${c ? c.name : 'Child'} checked out at ${checkOutTime}, picked up by ${pickedBy}.`
      });

      triggerPushNotification(`Child Checked Out`, `${c ? c.name : 'Your child'} has been checked out by ${pickedBy} at ${checkOutTime}.`);

      notifyListeners('attendance');
      return updatedRecord;
    }
  },

  markAbsent: async (childId: string): Promise<Attendance> => {
    const date = new Date().toISOString().split('T')[0];
    if (useFirebaseReal && firestoreDb) {
      const id = `${childId}_${date}`;
      const docRef = doc(firestoreDb, 'attendance', id);
      const attData: Attendance = {
        id,
        childId,
        date,
        status: 'Absent'
      };
      await setDoc(docRef, attData);
      return attData;
    } else {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      const existingIdx = att.findIndex(a => a.childId === childId && a.date === date);
      
      const newRecord: Attendance = {
        id: existingIdx !== -1 ? att[existingIdx].id : 'att-' + Date.now(),
        childId,
        date,
        status: 'Absent'
      };

      if (existingIdx !== -1) {
        att[existingIdx] = newRecord;
      } else {
        att.push(newRecord);
      }
      setStored('aangan_attendance', att);
      notifyListeners('attendance');
      return newRecord;
    }
  },

  saveDailyAttendance: async (presentChildIds: string[], teacherId: string): Promise<Attendance[]> => {
    const date = new Date().toISOString().split('T')[0];
    const timestampNow = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const children = await dbService.getChildren();

    const records: Attendance[] = [];

    for (const child of children) {
      const isPresent = presentChildIds.includes(child.id);
      const attendanceStatus = isPresent ? 'Present' : 'Absent';
      const departureStatus = isPresent ? 'In Center' : null;
      
      const attData: Attendance = {
        id: `${child.id}_${date}`,
        childId: child.id,
        date,
        status: isPresent ? 'Present' : 'Absent',
        checkInTime: isPresent ? timeStr : undefined,
        staffId: teacherId,
        
        // Daycare logic
        attendanceStatus,
        attendanceTime: timestampNow,
        teacherId,
        departureStatus,
        pickupTime: undefined,
        pickedBy: undefined,
        relationship: undefined,
        pickupReason: undefined
      };

      if (useFirebaseReal && firestoreDb) {
        const docRef = doc(firestoreDb, 'attendance', attData.id);
        await setDoc(docRef, attData);
      }
      records.push(attData);

      // Trigger notifications and activities if child is marked Present
      if (isPresent) {
        await dbService.createNotification({
          title: 'Attendance Recorded',
          message: `${child.name} is marked Present today.`,
          type: 'ChildSpecific',
          targetAudience: 'Selected Child',
          targetId: child.id,
          priority: 'Normal',
          status: 'Published'
        });

        // Log Activity
        if (useFirebaseReal && firestoreDb) {
          await addDoc(collection(firestoreDb, 'activities'), {
            type: 'check_in',
            childId: child.id,
            timestamp: timestampNow,
            details: `${child.name} marked Present today.`
          });
        } else {
          logActivity({
            id: 'act-' + Date.now() + '-' + child.id,
            type: 'check_in',
            childId: child.id,
            childName: child.name,
            childPhoto: child.photoUrl,
            timestamp: timestampNow,
            details: `${child.name} marked Present today.`
          });
        }
      } else {
        // Log Absent Activity
        if (useFirebaseReal && firestoreDb) {
          await addDoc(collection(firestoreDb, 'activities'), {
            type: 'absent',
            childId: child.id,
            timestamp: timestampNow,
            details: `${child.name} marked Absent today.`
          });
        } else {
          logActivity({
            id: 'act-' + Date.now() + '-' + child.id,
            type: 'absent',
            childId: child.id,
            childName: child.name,
            childPhoto: child.photoUrl,
            timestamp: timestampNow,
            details: `${child.name} marked Absent today.`
          });
        }
      }
    }

    if (!useFirebaseReal || !firestoreDb) {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      const filtered = att.filter(a => a.date !== date);
      filtered.push(...records);
      setStored('aangan_attendance', filtered);
    }

    notifyListeners('attendance');
    return records;
  },

  recordPickup: async (
    childId: string, 
    pickedBy: string, 
    relationship: string, 
    departureStatus: 'Picked Up' | 'Early Pickup', 
    pickupReason = ''
  ): Promise<Attendance> => {
    const date = new Date().toISOString().split('T')[0];
    const timestampNow = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const children = await dbService.getChildren();
    const child = children.find(ch => ch.id === childId);
    const childName = child ? child.name : 'Child';

    if (useFirebaseReal && firestoreDb) {
      const id = `${childId}_${date}`;
      const docRef = doc(firestoreDb, 'attendance', id);
      const current = await getDoc(docRef);
      const existingData = current.exists() ? current.data() as Attendance : { id, childId, date };
      
      const attData: Attendance = {
        ...existingData,
        status: 'Picked Up',
        checkOutTime: timeStr,
        pickedBy,
        
        // Daycare logic
        departureStatus,
        pickupTime: timestampNow,
        relationship,
        pickupReason
      } as Attendance;
      
      await setDoc(docRef, attData);

      const notificationMsg = departureStatus === 'Early Pickup'
        ? `${childName} was picked up early at ${timeStr} by ${pickedBy}.`
        : `${childName} was picked up at ${timeStr} by ${pickedBy}.`;
      
      await dbService.createNotification({
        title: departureStatus === 'Early Pickup' ? 'Early Pickup Recorded' : 'Regular Pickup Recorded',
        message: notificationMsg,
        type: 'ChildSpecific',
        targetAudience: 'Selected Child',
        targetId: childId,
        priority: 'Normal',
        status: 'Published'
      });

      await addDoc(collection(firestoreDb, 'activities'), {
        type: 'check_out',
        childId,
        timestamp: timestampNow,
        details: notificationMsg
      });

      notifyListeners('attendance');
      return attData;
    } else {
      const att = getStored<Attendance[]>('aangan_attendance', DEFAULT_ATTENDANCE);
      const existingIdx = att.findIndex(a => a.childId === childId && a.date === date);
      
      const existingRecord = existingIdx !== -1 ? att[existingIdx] : {
        id: 'att-' + Date.now(),
        childId,
        date,
        status: 'Present' as const,
        attendanceStatus: 'Present' as const,
        departureStatus: 'In Center' as const
      };

      const updatedRecord: Attendance = {
        ...existingRecord,
        status: 'Picked Up',
        checkOutTime: timeStr,
        pickedBy,
        
        // Daycare logic
        departureStatus,
        pickupTime: timestampNow,
        relationship,
        pickupReason
      };

      if (existingIdx !== -1) {
        att[existingIdx] = updatedRecord;
      } else {
        att.push(updatedRecord);
      }
      setStored('aangan_attendance', att);

      const notificationMsg = departureStatus === 'Early Pickup'
        ? `${childName} was picked up early at ${timeStr} by ${pickedBy}.`
        : `${childName} was picked up at ${timeStr} by ${pickedBy}.`;

      await dbService.createNotification({
        title: departureStatus === 'Early Pickup' ? 'Early Pickup Recorded' : 'Regular Pickup Recorded',
        message: notificationMsg,
        type: 'ChildSpecific',
        targetAudience: 'Selected Child',
        targetId: childId,
        priority: 'Normal',
        status: 'Published'
      });

      logActivity({
        id: 'act-' + Date.now(),
        type: 'check_out',
        childId,
        childName: childName,
        childPhoto: child?.photoUrl,
        timestamp: timestampNow,
        details: notificationMsg
      });

      notifyListeners('attendance');
      return updatedRecord;
    }
  },

  recordBulkPickup: async (
    childIds: string[],
    pickedBy = 'Authorized Parent/Guardian',
    relationship = 'Authorized Guardian',
    departureStatus: 'Picked Up' | 'Early Pickup' = 'Picked Up',
    pickupReason = ''
  ): Promise<void> => {
    // For each child, record their pickup
    for (const childId of childIds) {
      await dbService.recordPickup(childId, pickedBy, relationship, departureStatus, pickupReason);
    }
  },

  // --- Daily Updates ---
  getDailyUpdatesForChild: async (childId: string, date?: string): Promise<DailyUpdate[]> => {
    const filterDate = date || new Date().toISOString().split('T')[0];
    if (useFirebaseReal && firestoreDb) {
      const q = query(
        collection(firestoreDb, 'daily_updates'), 
        where('childId', '==', childId),
        where('date', '==', filterDate)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as DailyUpdate);
    } else {
      const updates = getStored<DailyUpdate[]>('aangan_daily_updates', DEFAULT_DAILY_UPDATES);
      return updates.filter(u => u.childId === childId && u.date === filterDate);
    }
  },

  saveDailyUpdate: async (updateData: Omit<DailyUpdate, 'id' | 'timestamp'>): Promise<DailyUpdate> => {
    const id = 'du-' + Date.now();
    const timestamp = new Date().toISOString();
    const newUpdate: DailyUpdate = { ...updateData, id, timestamp };

    // Get child's details for logging/notifications
    let childName = 'Your child';
    let childPhoto: string | undefined = undefined;

    if (useFirebaseReal && firestoreDb) {
      try {
        const cDoc = await getDoc(doc(firestoreDb, 'children', updateData.childId));
        if (cDoc.exists()) {
          const cData = cDoc.data() as Child;
          childName = cData.name;
          childPhoto = cData.photoUrl;
        }
      } catch (err) {
        console.error("Error fetching child details in saveDailyUpdate:", err);
      }

      const docRef = doc(firestoreDb, 'daily_updates', `${updateData.childId}_${updateData.date}`);
      await setDoc(docRef, newUpdate);

      // Trigger Activity Log (via Firestore if integrated or local fallback)
      logActivity({
        id: 'act-' + Date.now(),
        type: 'daily_update',
        childId: updateData.childId,
        childName,
        childPhoto,
        timestamp,
        details: `Updated daily log: meals registered, mood set to '${updateData.mood}'.`
      });

      triggerPushNotification(`Daily Update Added`, `${childName}'s daily activities and meals logs have been posted.`);
      notifyListeners('daily_updates');
    } else {
      const updates = getStored<DailyUpdate[]>('aangan_daily_updates', DEFAULT_DAILY_UPDATES);
      const existingIdx = updates.findIndex(u => u.childId === updateData.childId && u.date === updateData.date);
      
      if (existingIdx !== -1) {
        updates[existingIdx] = newUpdate;
      } else {
        updates.push(newUpdate);
      }
      setStored('aangan_daily_updates', updates);

      // Trigger Activity Log
      const children = getStored<Child[]>('aangan_children', DEFAULT_CHILDREN);
      const c = children.find(ch => ch.id === updateData.childId);
      if (c) {
        childName = c.name;
        childPhoto = c.photoUrl;
      }
      logActivity({
        id: 'act-' + Date.now(),
        type: 'daily_update',
        childId: updateData.childId,
        childName,
        childPhoto,
        timestamp,
        details: `Updated daily log: meals registered, mood set to '${updateData.mood}'.`
      });

      triggerPushNotification(`Daily Update Added`, `${childName}'s daily activities and meals logs have been posted.`);

      notifyListeners('daily_updates');
    }
    return newUpdate;
  },

  // --- Notifications (Announcements) ---
  getNotifications: async (): Promise<NotificationItem[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'notifications'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as NotificationItem);
    } else {
      return getStored<NotificationItem[]>('aangan_notifications', DEFAULT_NOTIFICATIONS)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  },

  createNotification: async (notData: Omit<NotificationItem, 'id' | 'createdAt' | 'createdBy'>): Promise<NotificationItem> => {
    const id = 'not-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const createdAt = new Date().toISOString();
    const createdBy = mockCurrentUser?.uid || 'admin-user-id';
    
    const newNotification: NotificationItem = {
      ...notData,
      id,
      createdAt,
      createdBy
    };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'notifications', id), newNotification);

      try {
        // Map user_notifications in Firestore
        const usersSnap = await getDocs(collection(firestoreDb, 'users'));
        const users = usersSnap.docs.map(d => d.data() as UserProfile);
        
        let targetUsers: UserProfile[] = [];
        if (newNotification.targetAudience === 'All Parents') {
          targetUsers = users.filter(u => u.role === 'parent');
        } else if (newNotification.targetAudience === 'All Staff') {
          targetUsers = users.filter(u => u.role === 'staff');
        } else if (newNotification.targetAudience === 'Selected Child' && newNotification.targetId) {
          targetUsers = users.filter(u => u.role === 'parent' && u.assignedChildId === newNotification.targetId);
        }

        for (const u of targetUsers) {
          const unId = `un-${u.uid}-${id}`;
          await setDoc(doc(firestoreDb, 'user_notifications', unId), {
            id: unId,
            userId: u.uid,
            notificationId: id,
            read: false
          });
        }
      } catch (err) {
        console.error("Error setting user_notifications in real Firebase:", err);
      }

      // If published, trigger browser FCM visual simulated notification
      if (newNotification.status === 'Published') {
        triggerPushNotification(
          `Announcement: ${newNotification.title}`,
          newNotification.message,
          newNotification.priority === 'Urgent' ? 'high' : 'normal'
        );
      }
    } else {
      const notifications = getStored<NotificationItem[]>('aangan_notifications', DEFAULT_NOTIFICATIONS);
      notifications.unshift(newNotification);
      setStored('aangan_notifications', notifications);

      // Map user_notifications
      const users = getStored<UserProfile[]>('aangan_users', DEFAULT_USERS);
      const userNotifications = getStored<UserNotificationStatus[]>('aangan_user_notifications', DEFAULT_USER_NOTIFICATIONS);
      
      // Determine target users
      let targetUsers: UserProfile[] = [];
      if (newNotification.targetAudience === 'All Parents') {
        targetUsers = users.filter(u => u.role === 'parent');
      } else if (newNotification.targetAudience === 'All Staff') {
        targetUsers = users.filter(u => u.role === 'staff');
      } else if (newNotification.targetAudience === 'Selected Child' && newNotification.targetId) {
        // Find parent assigned to this child
        targetUsers = users.filter(u => u.role === 'parent' && u.assignedChildId === newNotification.targetId);
      }

      targetUsers.forEach(u => {
        userNotifications.push({
          id: `un-${u.uid}-${id}`,
          userId: u.uid,
          notificationId: id,
          read: false
        });
      });

      setStored('aangan_user_notifications', userNotifications);

      // If published, trigger browser FCM visual simulated notification
      if (newNotification.status === 'Published') {
        triggerPushNotification(
          `Announcement: ${newNotification.title}`,
          newNotification.message,
          newNotification.priority === 'Urgent' ? 'high' : 'normal'
        );
      }

      notifyListeners('notifications');
      notifyListeners('user_notifications');
    }
    return newNotification;
  },

  updateNotification: async (id: string, notData: Partial<NotificationItem>): Promise<NotificationItem> => {
    if (useFirebaseReal && firestoreDb) {
      const ref = doc(firestoreDb, 'notifications', id);
      await updateDoc(ref, notData as any);
      const updated = await getDoc(ref);
      return { id: updated.id, ...updated.data() } as NotificationItem;
    } else {
      const notifications = getStored<NotificationItem[]>('aangan_notifications', DEFAULT_NOTIFICATIONS);
      const idx = notifications.findIndex(n => n.id === id);
      if (idx !== -1) {
        notifications[idx] = { ...notifications[idx], ...notData };
        setStored('aangan_notifications', notifications);
        notifyListeners('notifications');
        return notifications[idx];
      }
      throw new Error('Notification not found');
    }
  },

  deleteNotification: async (id: string): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'notifications', id));
    } else {
      const notifications = getStored<NotificationItem[]>('aangan_notifications', DEFAULT_NOTIFICATIONS);
      const updated = notifications.filter(n => n.id !== id);
      setStored('aangan_notifications', updated);

      const userNotifications = getStored<UserNotificationStatus[]>('aangan_user_notifications', DEFAULT_USER_NOTIFICATIONS);
      const updatedUN = userNotifications.filter(un => un.notificationId !== id);
      setStored('aangan_user_notifications', updatedUN);

      notifyListeners('notifications');
      notifyListeners('user_notifications');
    }
  },

  // --- Parent notifications ---
  getUserNotifications: async (userId: string): Promise<(NotificationItem & { read: boolean, unreadId: string })[]> => {
    // Get user's assigned child ID to filter public vs own-child notifications
    let assignedChildId: string | undefined = undefined;
    if (useFirebaseReal && firestoreDb) {
      const uDoc = await getDoc(doc(firestoreDb, 'users', userId));
      if (uDoc.exists()) {
        assignedChildId = (uDoc.data() as UserProfile).assignedChildId;
      }
    } else {
      const users = getStored<UserProfile[]>('aangan_users', DEFAULT_USERS);
      assignedChildId = users.find(u => u.uid === userId)?.assignedChildId;
    }

    if (useFirebaseReal && firestoreDb) {
      // Real firebase read joins
      const q = query(collection(firestoreDb, 'user_notifications'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const unStatuses = snapshot.docs.map(d => d.data() as UserNotificationStatus);
      
      const fullList = [];
      for (const status of unStatuses) {
        const docNot = await getDoc(doc(firestoreDb, 'notifications', status.notificationId));
        if (docNot.exists()) {
          fullList.push({
            ...(docNot.data() as NotificationItem),
            read: status.read,
            unreadId: status.id
          });
        }
      }
      return fullList
        .filter(n => n.targetAudience === 'All Parents' || (n.targetAudience === 'Selected Child' && n.targetId === assignedChildId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      const userNotifications = getStored<UserNotificationStatus[]>('aangan_user_notifications', DEFAULT_USER_NOTIFICATIONS);
      const notifications = getStored<NotificationItem[]>('aangan_notifications', DEFAULT_NOTIFICATIONS);
      
      const myStatuses = userNotifications.filter(un => un.userId === userId);
      return myStatuses.map(status => {
        const matchNot = notifications.find(n => n.id === status.notificationId);
        return {
          ...matchNot,
          read: status.read,
          unreadId: status.id
        } as (NotificationItem & { read: boolean, unreadId: string });
      }).filter(item => {
        if (item.title === undefined) return false;
        return item.targetAudience === 'All Parents' || (item.targetAudience === 'Selected Child' && item.targetId === assignedChildId);
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  },

  markNotificationAsRead: async (unreadId: string): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      await updateDoc(doc(firestoreDb, 'user_notifications', unreadId), { read: true, readAt: new Date().toISOString() });
    } else {
      const userNotifications = getStored<UserNotificationStatus[]>('aangan_user_notifications', DEFAULT_USER_NOTIFICATIONS);
      const idx = userNotifications.findIndex(un => un.id === unreadId);
      if (idx !== -1) {
        userNotifications[idx].read = true;
        userNotifications[idx].readAt = new Date().toISOString();
        setStored('aangan_user_notifications', userNotifications);
        notifyListeners('user_notifications');
      }
    }
  },

  // --- Recent activities ---
  getRecentActivities: async (limitCount = 50): Promise<ActivityLog[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'activities'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const rawActs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      
      const kids = await dbService.getChildren();
      const mapped: ActivityLog[] = rawActs.map((act: any) => {
        const c = kids.find(k => k.id === act.childId);
        return {
          id: act.id,
          type: act.type,
          childId: act.childId,
          childName: c ? c.name : 'Child',
          childPhoto: c ? c.photoUrl : undefined,
          timestamp: act.timestamp,
          details: act.details
        };
      });
      return mapped.slice(0, limitCount);
    } else {
      const acts = getStored<ActivityLog[]>('aangan_activities', []);
      if (acts.length === 0) {
        // Seed some initial activities if empty
        const initialActs: ActivityLog[] = [
          {
            id: 'act-init-1',
            type: 'check_in',
            childId: '',
            childName: '',
            childPhoto: '',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            details: 'Child marked Present today.'
          },
          {
            id: 'act-init-2',
            type: 'check_in',
            childId: '',
            childName: '',
            childPhoto: '',
            timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            details: 'Child marked Present today.'
          },
          {
            id: 'act-init-3',
            type: 'daily_update',
            childId: '',
            childName: '',
            childPhoto: '',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            details: 'Daily updates log saved.'
          }
        ];
        setStored('aangan_activities', initialActs);
        return initialActs;
      }
      return acts.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limitCount);
    }
  },

  // --- Phase 2: Fee Management ---
  getFees: async (): Promise<Fee[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'fees'), orderBy('dueDate', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Fee);
    } else {
      return getStored<Fee[]>('aangan_fees', DEFAULT_FEES).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
  },

  createFee: async (feeData: Omit<Fee, 'id' | 'createdAt'>): Promise<Fee> => {
    const id = 'fee-' + Date.now();
    const createdAt = new Date().toISOString();
    const newFee: Fee = { ...feeData, id, createdAt };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'fees', id), newFee);
    } else {
      const fees = getStored<Fee[]>('aangan_fees', DEFAULT_FEES);
      fees.push(newFee);
      setStored('aangan_fees', fees);

      // Create related calendar event
      const calendarEvents = getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
      calendarEvents.push({
        id: 'calev-' + id,
        title: `Fee Due: ${newFee.name}`,
        date: newFee.dueDate,
        type: 'FeeDue',
        description: `Payment due of ₹${newFee.amount} for ${newFee.name}.`,
        targetId: id
      });
      setStored('aangan_calendar_events', calendarEvents);
      notifyListeners('calendar_events');
      notifyListeners('fees');
    }
    return newFee;
  },

  deleteFee: async (id: string): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'fees', id));
    } else {
      const fees = getStored<Fee[]>('aangan_fees', DEFAULT_FEES);
      setStored('aangan_fees', fees.filter(f => f.id !== id));
      
      const calendarEvents = getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
      setStored('aangan_calendar_events', calendarEvents.filter(e => e.targetId !== id));

      notifyListeners('fees');
      notifyListeners('calendar_events');
    }
  },

  getPayments: async (): Promise<Payment[]> => {
    if (useFirebaseReal && firestoreDb) {
      const snapshot = await getDocs(collection(firestoreDb, 'payments'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Payment);
    } else {
      return getStored<Payment[]>('aangan_payments', DEFAULT_PAYMENTS);
    }
  },

  getPaymentsForChild: async (childId: string): Promise<Payment[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'payments'), where('childId', '==', childId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Payment);
    } else {
      const payments = getStored<Payment[]>('aangan_payments', DEFAULT_PAYMENTS);
      return payments.filter(p => p.childId === childId);
    }
  },

  recordPayment: async (paymentId: string, paidAmount: number, paymentMethod: PaymentMethod): Promise<Payment> => {
    const paymentDate = new Date().toISOString().split('T')[0];
    const receiptId = 'REC-' + Date.now().toString().slice(-6).toUpperCase();

    if (useFirebaseReal && firestoreDb) {
      const ref = doc(firestoreDb, 'payments', paymentId);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) throw new Error('Invoice record not found');
      const current = snapshot.data() as Payment;
      
      const totalPaid = current.paidAmount + paidAmount;
      const pending = current.amount - totalPaid;
      const status: PaymentStatus = pending <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';

      const updated = {
        ...current,
        paidAmount: totalPaid,
        pendingAmount: pending > 0 ? pending : 0,
        paymentDate,
        paymentMethod,
        status,
        receiptId
      };
      await setDoc(ref, updated);
      return updated;
    } else {
      const payments = getStored<Payment[]>('aangan_payments', DEFAULT_PAYMENTS);
      const idx = payments.findIndex(p => p.id === paymentId);
      if (idx === -1) throw new Error('Invoice record not found');

      const current = payments[idx];
      const totalPaid = current.paidAmount + paidAmount;
      const pending = current.amount - totalPaid;
      const status: PaymentStatus = pending <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';

      const updated: Payment = {
        ...current,
        paidAmount: totalPaid,
        pendingAmount: pending > 0 ? pending : 0,
        paymentDate,
        paymentMethod,
        status,
        receiptId
      };
      payments[idx] = updated;
      setStored('aangan_payments', payments);

      // Trigger standard notification for parents
      dbService.createNotification({
        title: `Payment Received: ${updated.feeName}`,
        message: `Dear Parent, we have registered a payment of ₹${paidAmount} via ${paymentMethod} for your child ${updated.childName}. Status is now '${status}'. Receipt ID: ${receiptId}.`,
        type: 'Payment',
        targetAudience: 'Selected Child',
        targetId: updated.childId,
        priority: 'Normal',
        status: 'Published'
      });

      notifyListeners('payments');
      return updated;
    }
  },

  addPayments: async (newPayments: Omit<Payment, 'id'>[]): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      for (const p of newPayments) {
        const id = 'pay-' + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(firestoreDb, 'payments', id), { ...p, id });
      }
    } else {
      const payments = getStored<Payment[]>('aangan_payments', DEFAULT_PAYMENTS);
      newPayments.forEach(p => {
        const id = 'pay-' + Math.random().toString(36).substr(2, 9);
        payments.push({ ...p, id });
      });
      setStored('aangan_payments', payments);
      notifyListeners('payments');
    }
  },

  // --- Phase 2: Pickup Authorization & Security ---
  getAuthorizedPickups: async (childId: string): Promise<AuthorizedPickup[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'authorized_pickups'), where('childId', '==', childId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as AuthorizedPickup);
    } else {
      const pickups = getStored<AuthorizedPickup[]>('aangan_authorized_pickups', DEFAULT_AUTHORIZED_PICKUPS);
      return pickups.filter(p => p.childId === childId);
    }
  },

  addAuthorizedPickup: async (pickup: Omit<AuthorizedPickup, 'id' | 'createdAt'>): Promise<AuthorizedPickup> => {
    const id = 'pickup-' + Date.now();
    const createdAt = new Date().toISOString();
    const newPickup: AuthorizedPickup = { ...pickup, id, createdAt };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'authorized_pickups', id), newPickup);
    } else {
      const pickups = getStored<AuthorizedPickup[]>('aangan_authorized_pickups', DEFAULT_AUTHORIZED_PICKUPS);
      pickups.push(newPickup);
      setStored('aangan_authorized_pickups', pickups);
      notifyListeners('authorized_pickups');
    }
    return newPickup;
  },

  deleteAuthorizedPickup: async (id: string): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'authorized_pickups', id));
    } else {
      const pickups = getStored<AuthorizedPickup[]>('aangan_authorized_pickups', DEFAULT_AUTHORIZED_PICKUPS);
      setStored('aangan_authorized_pickups', pickups.filter(p => p.id !== id));
      notifyListeners('authorized_pickups');
    }
  },

  getPickupLogs: async (childId?: string): Promise<PickupLog[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = childId 
        ? query(collection(firestoreDb, 'pickup_logs'), where('childId', '==', childId))
        : query(collection(firestoreDb, 'pickup_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q as any);
      return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as PickupLog);
    } else {
      const logs = getStored<PickupLog[]>('aangan_pickup_logs', DEFAULT_PICKUP_LOGS);
      if (childId) return logs.filter(l => l.childId === childId).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
      return logs.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    }
  },

  logPickup: async (logData: Omit<PickupLog, 'id' | 'timestamp'>): Promise<PickupLog> => {
    const id = 'plog-' + Date.now();
    const timestamp = new Date().toISOString();
    const newLog: PickupLog = { ...logData, id, timestamp };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'pickup_logs', id), newLog);
    } else {
      const logs = getStored<PickupLog[]>('aangan_pickup_logs', DEFAULT_PICKUP_LOGS);
      logs.unshift(newLog);
      setStored('aangan_pickup_logs', logs);

      // Trigger checkout in Attendance
      const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await dbService.checkOut(logData.childId, checkOutTime, logData.pickerName);

      notifyListeners('pickup_logs');
    }
    return newLog;
  },

  // --- Phase 2: Events & Programs ---
  getEvents: async (): Promise<DaycareEvent[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'events'), orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as DaycareEvent);
    } else {
      return getStored<DaycareEvent[]>('aangan_events', DEFAULT_EVENTS).sort((a,b) => a.date.localeCompare(b.date));
    }
  },

  createEvent: async (eventData: Omit<DaycareEvent, 'id' | 'rsvpCount' | 'createdAt'>): Promise<DaycareEvent> => {
    const id = 'event-' + Date.now();
    const createdAt = new Date().toISOString();
    const newEvent: DaycareEvent = { ...eventData, id, rsvpCount: 0, createdAt };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'events', id), newEvent);
    } else {
      const evs = getStored<DaycareEvent[]>('aangan_events', DEFAULT_EVENTS);
      evs.push(newEvent);
      setStored('aangan_events', evs);

      // Create in Calendar Events
      const calendarEvents = getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
      calendarEvents.push({
        id: 'calev-' + id,
        title: `Event: ${newEvent.title}`,
        date: newEvent.date,
        type: 'Event',
        description: `${newEvent.description}. Venue: ${newEvent.venue} at ${newEvent.time}.`,
        targetId: id
      });
      setStored('aangan_calendar_events', calendarEvents);

      // Create global notification about new Event
      dbService.createNotification({
        title: `New Daycare Event: ${newEvent.title}`,
        message: `Join us for "${newEvent.title}" on ${newEvent.date} at ${newEvent.time}. Location: ${newEvent.venue}. RSVP Deadline: ${newEvent.rsvpDeadline}.`,
        type: 'General',
        targetAudience: 'All Parents',
        priority: 'Important',
        status: 'Published'
      });

      notifyListeners('events');
      notifyListeners('calendar_events');
    }
    return newEvent;
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (useFirebaseReal && firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'events', id));
    } else {
      const evs = getStored<DaycareEvent[]>('aangan_events', DEFAULT_EVENTS);
      setStored('aangan_events', evs.filter(e => e.id !== id));

      const calendarEvents = getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
      setStored('aangan_calendar_events', calendarEvents.filter(e => e.targetId !== id && e.id !== `calev-${id}`));

      notifyListeners('events');
      notifyListeners('calendar_events');
    }
  },

  getEventRegistrations: async (eventId?: string): Promise<EventRegistration[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = eventId 
        ? query(collection(firestoreDb, 'event_registrations'), where('eventId', '==', eventId))
        : collection(firestoreDb, 'event_registrations');
      const snapshot = await getDocs(q as any);
      return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as EventRegistration);
    } else {
      const regs = getStored<EventRegistration[]>('aangan_event_registrations', DEFAULT_EVENT_REGISTRATIONS);
      if (eventId) return regs.filter(r => r.eventId === eventId);
      return regs;
    }
  },

  registerForEvent: async (regData: Omit<EventRegistration, 'id' | 'timestamp'>): Promise<EventRegistration> => {
    const id = 'ereg-' + Date.now();
    const timestamp = new Date().toISOString();
    const newReg: EventRegistration = { ...regData, id, timestamp };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'event_registrations', id), newReg);
    } else {
      const regs = getStored<EventRegistration[]>('aangan_event_registrations', DEFAULT_EVENT_REGISTRATIONS);
      const idx = regs.findIndex(r => r.eventId === regData.eventId && r.childId === regData.childId);
      if (idx !== -1) {
        regs[idx] = newReg;
      } else {
        regs.push(newReg);
      }
      setStored('aangan_event_registrations', regs);

      // Increment RSVP count on the event
      const evs = getStored<DaycareEvent[]>('aangan_events', DEFAULT_EVENTS);
      const evIdx = evs.findIndex(e => e.id === regData.eventId);
      if (evIdx !== -1 && regData.status === 'Yes') {
        evs[evIdx].rsvpCount = (evs[evIdx].rsvpCount || 0) + 1;
        setStored('aangan_events', evs);
      }

      notifyListeners('events');
      notifyListeners('event_registrations');
    }
    return newReg;
  },

  // --- Phase 2: Media Album & Gallery ---
  getAlbums: async (): Promise<MediaAlbum[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'albums'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as MediaAlbum);
    } else {
      return getStored<MediaAlbum[]>('aangan_albums', DEFAULT_ALBUMS).sort((a,b) => b.date.localeCompare(a.date));
    }
  },

  createAlbum: async (albumData: Omit<MediaAlbum, 'id' | 'createdAt'>): Promise<MediaAlbum> => {
    const id = 'alb-' + Date.now();
    const createdAt = new Date().toISOString();
    const newAlbum: MediaAlbum = { ...albumData, id, createdAt };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'albums', id), newAlbum);
    } else {
      const albs = getStored<MediaAlbum[]>('aangan_albums', DEFAULT_ALBUMS);
      albs.unshift(newAlbum);
      setStored('aangan_albums', albs);
      notifyListeners('albums');
    }
    return newAlbum;
  },

  getMediaItems: async (albumId: string): Promise<MediaItem[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = query(collection(firestoreDb, 'media'), where('albumId', '==', albumId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as MediaItem);
    } else {
      const media = getStored<MediaItem[]>('aangan_media', DEFAULT_MEDIA);
      return media.filter(m => m.albumId === albumId);
    }
  },

  addMediaItem: async (itemData: Omit<MediaItem, 'id' | 'uploadedAt'>): Promise<MediaItem> => {
    const id = 'med-' + Date.now();
    const uploadedAt = new Date().toISOString();
    const newItem: MediaItem = { ...itemData, id, uploadedAt };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'media', id), newItem);
    } else {
      const media = getStored<MediaItem[]>('aangan_media', DEFAULT_MEDIA);
      media.push(newItem);
      setStored('aangan_media', media);
      notifyListeners('media');
    }
    return newItem;
  },

  // --- Phase 2: Incident Reports ---
  getIncidentReports: async (childId?: string): Promise<IncidentReport[]> => {
    if (useFirebaseReal && firestoreDb) {
      const q = childId 
        ? query(collection(firestoreDb, 'incident_reports'), where('childId', '==', childId))
        : query(collection(firestoreDb, 'incident_reports'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q as any);
      return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as IncidentReport);
    } else {
      const reports = getStored<IncidentReport[]>('aangan_incidents', DEFAULT_INCIDENT_REPORTS);
      if (childId) return reports.filter(r => r.childId === childId).sort((a,b) => b.date.localeCompare(a.date));
      return reports.sort((a,b) => b.date.localeCompare(a.date));
    }
  },

  createIncidentReport: async (report: Omit<IncidentReport, 'id' | 'parentAcknowledged'>): Promise<IncidentReport> => {
    const id = 'inc-' + Date.now();
    const newReport: IncidentReport = { ...report, id, parentAcknowledged: false };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'incident_reports', id), newReport);
    } else {
      const reports = getStored<IncidentReport[]>('aangan_incidents', DEFAULT_INCIDENT_REPORTS);
      reports.unshift(newReport);
      setStored('aangan_incidents', reports);

      // Create calendar log about the incident for schedule view
      const calendarEvents = getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
      calendarEvents.push({
        id: 'calev-' + id,
        title: `Incident: ${newReport.childName}`,
        date: newReport.date,
        type: 'Notice',
        description: `Logged a ${newReport.type} incident involving ${newReport.childName} in the ${newReport.location}.`
      });
      setStored('aangan_calendar_events', calendarEvents);

      // Broadcast child-specific notification for the parent
      dbService.createNotification({
        title: `Incident Report Registered`,
        message: `An incident involving ${newReport.childName} was logged on ${newReport.date} at ${newReport.time}. Please click to view details and acknowledge the report in your dashboard.`,
        type: 'Emergency',
        targetAudience: 'Selected Child',
        targetId: newReport.childId,
        priority: 'Important',
        status: 'Published'
      });

      notifyListeners('incident_reports');
      notifyListeners('calendar_events');
    }
    return newReport;
  },

  acknowledgeIncident: async (reportId: string, parentName: string): Promise<IncidentReport> => {
    const ackDate = new Date().toISOString();

    if (useFirebaseReal && firestoreDb) {
      const ref = doc(firestoreDb, 'incident_reports', reportId);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) throw new Error('Incident report not found');
      const current = snapshot.data() as IncidentReport;
      const updated = {
        ...current,
        parentAcknowledged: true,
        parentAcknowledgeName: parentName,
        parentAcknowledgeDate: ackDate
      };
      await setDoc(ref, updated);
      return updated;
    } else {
      const reports = getStored<IncidentReport[]>('aangan_incidents', DEFAULT_INCIDENT_REPORTS);
      const idx = reports.findIndex(r => r.id === reportId);
      if (idx === -1) throw new Error('Incident report not found');

      const updated: IncidentReport = {
        ...reports[idx],
        parentAcknowledged: true,
        parentAcknowledgeName: parentName,
        parentAcknowledgeDate: ackDate
      };
      reports[idx] = updated;
      setStored('aangan_incidents', reports);

      notifyListeners('incident_reports');
      return updated;
    }
  },

  // --- Phase 2: Calendar & Schedules ---
  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    if (useFirebaseReal && firestoreDb) {
      const snapshot = await getDocs(collection(firestoreDb, 'calendar_events'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as CalendarEvent);
    } else {
      return getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
    }
  },

  createCalendarEvent: async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    const id = 'calev-' + Date.now();
    const newEvent: CalendarEvent = { ...event, id };

    if (useFirebaseReal && firestoreDb) {
      await setDoc(doc(firestoreDb, 'calendar_events', id), newEvent);
    } else {
      const events = getStored<CalendarEvent[]>('aangan_calendar_events', DEFAULT_CALENDAR_EVENTS);
      events.push(newEvent);
      setStored('aangan_calendar_events', events);
      notifyListeners('calendar_events');
    }
    return newEvent;
  },

  // Real-time listener registrations
  subscribe: (collectionName: string, cb: CallbackType): (() => void) => {
    if (dbListeners[collectionName]) {
      dbListeners[collectionName].push(cb);
    }
    return () => {
      if (dbListeners[collectionName]) {
        dbListeners[collectionName] = dbListeners[collectionName].filter(listener => listener !== cb);
      }
    };
  }
};

// Internal utility to log activities
function logActivity(act: ActivityLog) {
  const acts = getStored<ActivityLog[]>('aangan_activities', []);
  acts.unshift(act);
  setStored('aangan_activities', acts.slice(0, 100)); // cap at 100
  notifyListeners('activities');
}

// -------------------------------------------------------------
// PUSH NOTIFICATIONS / FCM SIMULATION
// -------------------------------------------------------------

type PushNotificationCallback = (title: string, message: string, priority?: string) => void;
const pushSubscribers: PushNotificationCallback[] = [];

export function subscribeToPushNotifications(cb: PushNotificationCallback): () => void {
  pushSubscribers.push(cb);
  return () => {
    const idx = pushSubscribers.indexOf(cb);
    if (idx !== -1) pushSubscribers.splice(idx, 1);
  };
}

function triggerPushNotification(title: string, message: string, priority = 'normal') {
  // Trigger active browser push notification if supported
  if (Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
  pushSubscribers.forEach(cb => cb(title, message, priority));
}

// Prompt for permission gracefully
export function requestPushNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
}
