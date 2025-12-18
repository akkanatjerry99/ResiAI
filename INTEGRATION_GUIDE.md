# 🔗 Frontend-Backend Integration Guide

This guide explains how to connect your existing frontend to the new backend API.

## Current State

Your frontend currently uses:
- `secureDatabase.ts` - Local IndexedDB storage
- `geminiService.ts` - Direct Gemini API calls
- Local state management

## New Architecture

With the backend, data flows like this:
```
Frontend (React) 
    ↓ HTTP Requests
API Client (apiClient.ts)
    ↓ REST API
Backend Server (Express)
    ↓ Mongoose
MongoDB Database
```

## Integration Steps

### 1. Use API Client Instead of Local Storage

**Before (using local storage):**
```typescript
import { secureDB } from './services/secureDatabase';

// Getting patients
const patients = await secureDB.getAllPatients();

// Adding patient
await secureDB.savePatient(newPatient);
```

**After (using backend API):**
```typescript
import apiClient from './services/apiClient';

// Getting patients
const { patients } = await apiClient.getAllPatients();

// Adding patient
await apiClient.createPatient(newPatient);
```

### 2. Authentication Flow

**Login:**
```typescript
import apiClient from './services/apiClient';

// User logs in
const result = await apiClient.login(email, password);
// Token is automatically stored in localStorage
// Now all subsequent requests include the token

// Get user profile
const { user } = await apiClient.getProfile();
```

**Register:**
```typescript
const result = await apiClient.register({
  email: 'doctor@hospital.com',
  password: 'SecurePassword123',
  name: 'Dr. John Doe',
  role: 'Resident'
});
// Token is automatically stored
```

**Logout:**
```typescript
apiClient.clearToken();
// Redirect to login
```

### 3. Replace Patient Operations

#### Get All Patients
```typescript
// With optional filters
const { patients } = await apiClient.getAllPatients({
  acuity: 'Unstable',
  search: 'pneumonia'
});
```

#### Get Single Patient
```typescript
const { patient } = await apiClient.getPatientById(patientId);
```

#### Create Patient
```typescript
const { patient } = await apiClient.createPatient({
  name: 'John Smith',
  age: 65,
  gender: 'M',
  diagnosis: 'Pneumonia',
  room: '401A',
  admissionDate: '2025-12-10',
  acuity: 'Watch',
  // ... other fields
});
```

#### Update Patient
```typescript
await apiClient.updatePatient(patientId, {
  acuity: 'Stable',
  // ... updated fields
});
```

#### Delete Patient
```typescript
await apiClient.deletePatient(patientId);
```

### 4. Task Management

```typescript
// Add task
await apiClient.addTask(patientId, {
  description: 'Check morning labs',
  priority: 'Before Noon'
});

// Update task
await apiClient.updateTask(patientId, taskId, {
  isCompleted: true
});

// Delete task
await apiClient.deleteTask(patientId, taskId);
```

### 5. Medication Management

```typescript
// Add medication
await apiClient.addMedication(patientId, {
  name: 'Ceftriaxone',
  dose: '2g',
  route: 'IV',
  frequency: 'q24h'
});

// Update medication
await apiClient.updateMedication(patientId, medicationId, {
  isActive: false,
  endDate: '2025-12-15'
});
```

### 6. Lab Results

```typescript
await apiClient.addLabResult(patientId, {
  labType: 'creatinine',
  date: '2025-12-13',
  value: 1.2
});
```

### 7. Statistics

```typescript
const { statistics } = await apiClient.getStatistics();
// Returns: { totalPatients, stableCount, watchCount, unstableCount, pendingTasks }
```

## Updating Your Components

### Example: App.tsx Updates

**Before:**
```typescript
const [patients, setPatients] = useState<Patient[]>([]);

useEffect(() => {
  const loadData = async () => {
    const data = await secureDB.getAllPatients();
    setPatients(data);
  };
  loadData();
}, []);
```

**After:**
```typescript
import apiClient from './services/apiClient';

const [patients, setPatients] = useState<Patient[]>([]);

useEffect(() => {
  const loadData = async () => {
    try {
      const { patients: data } = await apiClient.getAllPatients();
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
      // Handle error (e.g., redirect to login if unauthorized)
    }
  };
  loadData();
}, []);
```

### Example: Add Patient Modal

**Before:**
```typescript
const handleSubmit = async () => {
  const newPatient = { /* patient data */ };
  await secureDB.savePatient(newPatient);
  setPatients([...patients, newPatient]);
};
```

**After:**
```typescript
const handleSubmit = async () => {
  try {
    const { patient } = await apiClient.createPatient({
      /* patient data */
    });
    setPatients([...patients, patient]);
  } catch (error) {
    console.error('Failed to create patient:', error);
    // Show error message to user
  }
};
```

## Error Handling

The API client throws errors that you should catch:

```typescript
try {
  const result = await apiClient.someMethod();
  // Success
} catch (error) {
  if (error.message === 'Authentication required') {
    // Redirect to login
    window.location.href = '/login';
  } else {
    // Show error to user
    alert('Error: ' + error.message);
  }
}
```

## Authentication State

Check if user is logged in:

```typescript
const isLoggedIn = !!localStorage.getItem('authToken');

if (!isLoggedIn) {
  // Redirect to login
}
```

## Migration Strategy

### Option 1: Gradual Migration
1. Keep existing local storage code
2. Add backend API calls alongside
3. Gradually replace local storage calls
4. Remove local storage once fully migrated

### Option 2: Complete Switch
1. Comment out all `secureDB` calls
2. Replace with `apiClient` calls
3. Test thoroughly
4. Remove old code

## Testing Your Integration

### 1. Start Both Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

### 2. Test Authentication Flow
1. Register new user
2. Login
3. Check token in localStorage
4. Try accessing protected routes

### 3. Test Patient Operations
1. Create a patient
2. View patient list
3. Update patient
4. Delete patient

### 4. Test Tasks & Medications
1. Add tasks to patient
2. Mark tasks complete
3. Add medications
4. Update medication status

## Troubleshooting

### "Network Error" or "Failed to fetch"
- Check backend is running on port 5000
- Check `VITE_API_URL` in `.env.development`
- Check CORS settings in backend

### "Authentication required"
- User needs to login
- Token may have expired
- Check token in localStorage

### "Cannot find apiClient"
- Make sure `services/apiClient.ts` exists
- Check import path
- Restart dev server

### Data Not Showing
- Check network tab in browser DevTools
- Verify API response format
- Check for JavaScript errors in console

## Benefits of Backend Integration

✅ **Centralized Data**: All users see the same data
✅ **Security**: Data encrypted at rest and in transit
✅ **Scalability**: Can handle many concurrent users
✅ **Collaboration**: Real-time updates possible
✅ **Audit Trail**: All actions logged
✅ **Backup**: Data safely stored in database
✅ **Access Control**: Role-based permissions

## Next Steps

1. Start with authentication (login/register)
2. Migrate patient list view
3. Migrate patient detail view
4. Add task operations
5. Add medication operations
6. Add lab result operations
7. Test everything thoroughly
8. Remove old local storage code

## Need Help?

- Check `backend/README.md` for API documentation
- Review `backend/api-tests.http` for request examples
- Look at `services/apiClient.ts` for available methods
- Check browser console for errors

---

**Your backend is ready! Start integrating today! 🚀**
