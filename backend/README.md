# ResiFlow Backend API

Backend server for the ResiFlow Medical Management System.

## Features

- 🔐 **Secure Authentication**: JWT-based authentication with role-based access control
- 🏥 **Patient Management**: Complete CRUD operations for patient records
- 💊 **Medication Tracking**: Medication management and interaction checking
- 🧪 **Lab Results**: Lab result storage and trend analysis
- 📊 **Analytics**: Patient statistics and dashboard data
- 🔒 **Data Encryption**: AES-256 encryption for sensitive medical data
- 📝 **Audit Logging**: Comprehensive audit trail for HIPAA compliance
- 🚀 **RESTful API**: Well-structured REST API with validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, bcrypt, express-rate-limit
- **Logging**: Winston
- **Validation**: express-validator

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher) - Local or MongoDB Atlas
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/resiflow
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGIN=http://localhost:5173
```

4. Start MongoDB (if running locally):
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

5. Run the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Building for Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PUT | `/api/auth/profile` | Update profile | Yes |
| POST | `/api/auth/verify-pin` | Verify user PIN | Yes |
| POST | `/api/auth/set-pin` | Set user PIN | Yes |
| GET | `/api/auth/users` | Get all users | Yes (Admin) |

### Patients

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/patients` | Get all patients | Yes |
| GET | `/api/patients/statistics` | Get statistics | Yes |
| GET | `/api/patients/:id` | Get patient by ID | Yes |
| POST | `/api/patients` | Create patient | Yes |
| PUT | `/api/patients/:id` | Update patient | Yes |
| DELETE | `/api/patients/:id` | Delete patient | Yes (Admin/Attending) |

### Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/patients/:patientId/tasks` | Add task | Yes |
| PUT | `/api/patients/:patientId/tasks/:taskId` | Update task | Yes |
| DELETE | `/api/patients/:patientId/tasks/:taskId` | Delete task | Yes |

### Medications

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/patients/:patientId/medications` | Add medication | Yes |
| PUT | `/api/patients/:patientId/medications/:medicationId` | Update medication | Yes |

### Labs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/patients/:patientId/labs` | Add lab result | Yes |

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **Admin**: Full access to all resources
- **Attending**: Can create, read, update, and delete patients
- **Resident**: Can create, read, and update patients
- **Nurse**: Can read and update patient information
- **Night Shift**: Limited access to patient data

## Request/Response Examples

### Register User

**Request:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "password": "SecurePassword123",
  "name": "Dr. John Doe",
  "role": "Resident"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "doctor@hospital.com",
    "name": "Dr. John Doe",
    "role": "Resident",
    "status": "Active"
  }
}
```

### Create Patient

**Request:**
```bash
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "age": 65,
  "gender": "M",
  "diagnosis": "Pneumonia",
  "room": "401A",
  "admissionDate": "2025-12-10",
  "acuity": "Watch",
  "underlyingConditions": "DM, HTN",
  "allergies": "Penicillin"
}
```

**Response:**
```json
{
  "message": "Patient created successfully",
  "patient": {
    "_id": "507f191e810c19729de860ea",
    "name": "John Smith",
    "age": 65,
    "gender": "M",
    "diagnosis": "Pneumonia",
    "room": "401A",
    "admissionDate": "2025-12-10",
    "acuity": "Watch",
    "medications": [],
    "tasks": [],
    "timeline": []
  }
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Protection against brute force attacks
- **Data Encryption**: AES-256-CBC for sensitive data
- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: express-validator for request validation
- **Audit Logging**: Complete audit trail for compliance

## Database Schema

### User Schema
- email, password, name, role, status
- PIN authentication support
- Login attempt tracking and account lockout

### Patient Schema
- Basic information (name, age, gender, diagnosis, room)
- Medical data (medications, labs, imaging, cultures)
- Tasks and timeline events
- Consultations and advanced care planning
- Audit fields (createdBy, lastModifiedBy)

### Audit Log Schema
- userId, action, resource, resourceId
- Details, timestamp, IP address

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/resiflow |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| ENCRYPTION_KEY | Data encryption key | - |
| GEMINI_API_KEY | Google Gemini API key | - |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:5173 |
| BCRYPT_ROUNDS | Password hashing rounds | 10 |
| MAX_LOGIN_ATTEMPTS | Max failed login attempts | 5 |
| LOCKOUT_TIME | Account lockout duration (ms) | 900000 |

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── index.ts         # App entry point
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Define route in `src/routes/`
3. Add validation in `src/middleware/validation.ts`
4. Import route in `src/index.ts`

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Cloud Platforms

- **Heroku**: Use Heroku CLI with Procfile
- **AWS**: Deploy to EC2 or use Elastic Beanstalk
- **Google Cloud**: Use App Engine or Cloud Run
- **DigitalOcean**: Use App Platform or Droplets

## Monitoring & Logging

Logs are written to:
- Console (colored output in development)
- `logs/app.log` (all logs)
- `logs/error.log` (errors only)

## Contributing

1. Follow TypeScript and Express best practices
2. Add proper error handling
3. Include input validation
4. Write audit logs for sensitive operations
5. Update API documentation

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
