import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      default: '',
      maxlength: [50, 'First name must be less than 50 characters'],
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      default: '',
      maxlength: [50, 'Last name must be less than 50 characters'],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: [100, 'Email must be less than 100 characters'],
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      select: false,
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    photo: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Photo must be less than 500 characters'],
    },
    contactInfo: {
      phone: { type: String, trim: true, default: '' },
      altPhone: { type: String, trim: true, default: '' },
      whatsapp: { type: String, trim: true, default: '' },
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'teacher', 'guardian'],
      default: 'student',
    },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      zip: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    socialMedia: {
      facebook: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
    },
    complaints: [{ type: Schema.Types.ObjectId, ref: 'Complaint' }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = model('User', userSchema);

export default User;
