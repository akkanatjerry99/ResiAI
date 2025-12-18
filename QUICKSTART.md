# 🚀 Quick Start Guide

Get ResiFlow AI running in 5 minutes!

## Prerequisites Check

- [ ] Node.js installed (v18+): `node --version`
- [ ] MongoDB installed OR MongoDB Atlas account
- [ ] Gemini API key from [AI Studio](https://ai.google.dev)

## Step 1: Clone & Install (2 min)

```bash
cd resiflow-ai

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## Step 2: Configure Environment (1 min)

### Backend Configuration
Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/resiflow
JWT_SECRET=change-this-to-random-string-minimum-32-chars
GEMINI_API_KEY=your-gemini-api-key-here
```

### Frontend Configuration
Edit `.env.local`:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

Edit `.env.development`:
```env
VITE_API_URL=http://localhost:5000/api
```

## Step 3: Start MongoDB (30 sec)

**Option A: Local MongoDB**
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Update `MONGODB_URI` in `backend/.env`

## Step 4: Start Servers (30 sec)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Wait for: `✓ Server running on http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Wait for: `Local: http://localhost:5173`

## Step 5: Open App (10 sec)

Open your browser to: **http://localhost:5173**

## First Time Setup

1. **Register**: Create your admin account
2. **Set PIN**: Quick access code
3. **Add Patients**: Start managing patients

## Verify Everything Works

### ✅ Backend Health Check
Open: http://localhost:5000/health

Should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

### ✅ Test API (Optional)
1. Install "REST Client" VS Code extension
2. Open `backend/api-tests.http`
3. Click "Send Request" on health check

### ✅ Frontend Working
You should see the ResiFlow dashboard with:
- Login/Register page OR
- Patient list (if already logged in)

## Common Issues & Fixes

### ❌ "Cannot connect to MongoDB"
```bash
# Check if MongoDB is running
Get-Process mongod

# Start it
net start MongoDB

# Or use MongoDB Atlas cloud database
```

### ❌ "Port 5000 already in use"
Change port in `backend/.env`:
```env
PORT=5001
```

### ❌ "CORS Error"
Check `CORS_ORIGIN` in `backend/.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

### ❌ TypeScript errors in backend
Just install dependencies:
```bash
cd backend
npm install
```

### ❌ Frontend can't reach API
Check `.env.development`:
```env
VITE_API_URL=http://localhost:5000/api
```

## What's Next?

### 📚 Learn More
- **Backend API**: Read `backend/README.md`
- **Full Docs**: Read `README.md`
- **Backend Summary**: Read `BACKEND_SUMMARY.md`

### 🧪 Test Features
1. Create a patient
2. Add medications
3. Add lab results
4. Generate AI summary
5. Create handoff

### 🚀 Deploy
- Frontend: Vercel, Netlify
- Backend: Heroku, Railway, DigitalOcean
- Database: MongoDB Atlas

## Need Help?

1. Check `backend/README.md` for detailed API docs
2. Review `BACKEND_SUMMARY.md` for architecture
3. Look at `backend/api-tests.http` for API examples
4. Check console logs for errors

## Success! 🎉

If you see the ResiFlow dashboard, you're all set!

The system includes:
- ✅ Secure authentication
- ✅ Patient management
- ✅ AI-powered features
- ✅ Lab tracking
- ✅ Medication management
- ✅ Task lists
- ✅ Handoff generation

---

**Happy coding! 🏥💻**
