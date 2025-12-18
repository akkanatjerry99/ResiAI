import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'Admin' | 'Attending' | 'Resident' | 'Nurse' | 'Night Shift';
  status: 'Active' | 'Inactive' | 'On Leave';
  avatar?: string;
  lastActive?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  pin?: string;
  nightPin?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  comparePin(candidatePin: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Attending', 'Resident', 'Nurse', 'Night Shift'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave'],
      default: 'Active',
    },
    avatar: String,
    lastActive: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    pin: {
      type: String,
      select: false,
    },
    nightPin: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Methods will be defined in auth service
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  if (!this.pin) return false;
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePin, this.pin);
};

export default mongoose.model<IUser>('User', UserSchema);
