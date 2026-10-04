# School Management System

A comprehensive school management backend API built with Node.js, Express, and MongoDB.

## Features
- User, Teacher, and Admin management
- Role-based access control
- Class, Course, Exam, and Attendance tracking
- Secure authentication with JWT & bcrypt
- Cloudinary integration for media assets
- Stripe payment integration

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB connection URI

### Installation
```bash
npm install
```

### Environment Variables
Configure `.env` in the root directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

### Running Locally
```bash
npm run dev
```
