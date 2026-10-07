# School Management System

A comprehensive school management backend API built with Node.js, Express, and MongoDB with advanced admin panel functionality.

## Features

### Core Features
- User, Teacher, and Admin management
- Role-based access control (RBAC)
- Class, Course, Exam, and Attendance tracking
- Secure authentication with JWT & bcrypt
- Cloudinary integration for media assets
- Stripe payment integration

### Admin Features
- **Admin Dashboard** - Comprehensive admin panel with system statistics and overview
- **Announcement Management** - Create, update, and manage school announcements
- **Class Management** - Create, read, update classes with course linking and cover images
- **Course Management** - Manage courses with teacher assignments and class associations
- **Complaint Management** - Track and view student/teacher complaints with reporter details
- **Admin Authentication** - Secure admin middleware with role-based access control
- **File Upload Management** - Multer integration for class cover images and file uploads
- **Admin Data Seeding** - Automatic admin initialization on database connection

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB connection URI
- Cloudinary account (for media management)
- Stripe account (for payment processing)

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
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Running Locally
```bash
npm run dev
```

## Project Structure

```
src/
├── config/
│   ├── cloudinary.js       # Cloudinary configuration
│   ├── env.js              # Environment variables configuration
│   └── seedAdmin.js        # Admin seed initialization
├── models/
│   ├── user.model.js       # User schema (base for all users)
│   ├── admin.model.js      # Admin profile model
│   ├── student.model.js    # Student profile model
│   ├── teacher.model.js    # Teacher profile model
│   ├── guardian.model.js   # Guardian/Parent schema
│   ├── class.model.js      # Class/Classroom schema
│   ├── course.model.js     # Course schema
│   ├── announcement.model.js # Announcements model
│   ├── complaint.model.js  # Complaints model
│   ├── attendance.model.js # Attendance tracking
│   ├── assignment.model.js # Assignment management
│   ├── exam.model.js       # Exam model
│   ├── quiz.model.js       # Quiz model
│   ├── lesson.model.js     # Lesson model
│   ├── homework.model.js   # Homework model
│   ├── event.model.js      # Event model
│   ├── resource.model.js   # Resource model
│   ├── address.model.js    # Address schema
│   ├── payment.model.js    # Payment tracking
│   └── notification.model.js # Notifications model
├── controllers/
│   └── admin/
│       ├── admin.controller.js         # Admin authentication & profile management
│       ├── dashboard.controller.js     # Dashboard statistics and overview
│       ├── announcement.controller.js  # Announcement CRUD operations
│       ├── class.controller.js         # Class management operations
│       ├── course.controller.js        # Course management operations
│       └── complaint.controller.js     # Complaint viewing and management
├── middleware/
│   ├── admin.middleware.js   # Admin authentication & authorization
│   └── multer.middleware.js  # File upload configuration (Cloudinary integration)
├── routes/
│   ├── admin.route.js   # Admin API routes
│   ├── teacher.route.js # Teacher API routes
│   └── user.route.js    # User API routes
└── index.js             # Application entry point
```

## API Routes

### Admin Routes (`/api/admin`)

#### Authentication & Profile
- **POST** `/login` - Admin login with credentials
- **GET** `/me` - Get current admin profile (requires authentication)
- **PATCH** `/change-password` - Change admin password
- **PATCH** `/update-photo` - Update admin profile photo

#### Dashboard
- **GET** `/dashboard` - Get dashboard statistics and system overview

#### Announcements
- **POST** `/announcements` - Create new announcement
- **GET** `/announcements` - List all announcements with search
- **GET** `/announcements/:id` - Get announcement details
- **PATCH** `/announcements/:id` - Update announcement

#### Classes
- **POST** `/classes` - Create new class (with cover image upload)
- **GET** `/classes` - List all classes with search and filters
- **GET** `/classes/:id` - Get class details with students and teachers
- **PATCH** `/classes/:id` - Update class information (with image management)

#### Courses
- **POST** `/courses` - Create new course with optional class linking
- **GET** `/courses` - List all courses with search and status/type filters
- **GET** `/courses/:id` - Get course details with teachers and students
- **PATCH** `/courses/:id` - Update course information and class assignment

#### Complaints
- **GET** `/complaints` - List all complaints with reporter details
- **GET** `/complaints/:id` - Get specific complaint details

## Middleware

### Admin Middleware (`admin.middleware.js`)
Validates admin authentication and authorization for protected routes.

### Multer Middleware (`multer.middleware.js`)
Handles file uploads with configurable storage and file type validation.

## Database Models

### Core User Models
- **User** - Base schema for all system users (students, teachers, admin)
- **Student** - Student profile with enrollment and guardian links
- **Teacher** - Teacher profile with subject assignments
- **Admin** - Admin user with system permissions
- **Guardian** - Parent/guardian information with student links

### Educational Content Models
- **Class** - Classroom information with courses, teachers, and students
- **Course** - Course details with assignments to classes and teachers
- **Lesson** - Individual lesson content and structure
- **Assignment** - Teacher assignments with deadlines and grading
- **Homework** - Student homework tasks and submissions
- **Resource** - Educational resources and materials

### Academic Tracking Models
- **Attendance** - Student attendance records by class and date
- **Exam** - Exam definitions with schedules and details
- **Quiz** - Quiz questions and student responses
- **Payment** - Student payment and fee tracking
- **Grade/Score** - Academic performance records

### Communication & Management Models
- **Announcement** - School announcements and notifications
- **Complaint** - Student/teacher complaints and grievances
- **Event** - School events and activities
- **Notification** - System notifications for users

### Support Models
- **Address** - Address schema used by user profiles
- **File Upload** - Cloudinary integration for media assets

## Authentication & Security

- **JWT-based authentication** with token validation
- **Bcrypt password hashing** for secure storage
- **Admin role-based access control (RBAC)** with middleware protection
- **Admin middleware** for request authentication on protected routes
- **Secure token validation** on every protected endpoint
- **Profile update protection** with admin authentication

## Implementation Status

### ✅ Completed Features

#### Admin Panel
- Admin login and authentication
- Admin profile management (view, change password, update photo)
- Admin dashboard with system statistics

#### Class Management
- Create classes with cover images and course assignments
- View all classes with pagination and advanced search
- Filter classes by active status
- Search by class name, code, grade level, academic year
- Update class information with image management
- Link/unlink courses to classes
- View class details with teacher and student information

#### Course Management
- Create courses with optional class association
- View all courses with advanced filtering
- Filter by course status (Active/Inactive) and type (Core/Elective)
- Search courses by name, code, or description
- Update course information and class assignments
- Assign teachers to courses
- View course details with enrollment information

#### Complaint Management
- View all complaints with reporter information
- Get complaint details with full context
- Reporter hydration with student/teacher/guardian profiles
- Efficient batch loading of reporter information

#### Announcement Management
- Create, read, update, and delete announcements
- Search and list announcements
- View announcement details

### 🚀 Planned Features

- Student management and enrollment
- Teacher management and assignment
- Attendance tracking and reports
- Exam and quiz management
- Assignment submission and grading
- Payment and fee management
- Real-time notifications
- Advanced reporting and analytics
- Mobile app integration

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens), bcrypt
- **File Management**: Cloudinary, Multer
- **Payment Processing**: Stripe
- **Validation**: Mongoose schemas with custom validators
- **Error Handling**: Express error middleware with status codes
- **Environment**: dotenv for configuration management

## Key Features Detail

### File Upload Management
- **Cloudinary Integration** for reliable image storage
- **Multer Middleware** for handling file uploads
- **Class Cover Images** support with automatic cleanup
- **Automatic deletion** of old images when replaced

### Class-Course Relationship
- **Bidirectional sync** between Class and Course models
- **Course linking** to classes during class creation/update
- **Automatic unlinking** when courses are removed from classes
- **Course exclusivity** - courses belong to only one class
- **Batch validation** of course IDs before linking

### Search & Filter Capabilities
- **Text search** on class name, code, and description
- **Status filtering** for active/inactive classes and courses
- **Type filtering** for courses (Core/Elective)
- **Regex-based search** for flexible querying
- **Pagination support** in list endpoints

### Error Handling
- **Input validation** with meaningful error messages
- **Duplicate prevention** for class codes and course codes
- **ID validation** using Mongoose ObjectId validation
- **404 handling** for missing resources
- **409 Conflict** responses for duplicate entries
- **400 Bad Request** for invalid inputs

## Quick Start Examples

### Admin Login
```bash
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@school.com",
  "password": "secure_password"
}
```

### Create a Class
```bash
POST /api/admin/classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "className": "Class 10-A",
  "classCode": "10A",
  "grade": 10,
  "academicYear": "2024-2025",
  "description": "Advanced Mathematics and Science",
  "courses": ["courseId1", "courseId2"]
}
```

### Create a Course
```bash
POST /api/admin/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseName": "Advanced Mathematics",
  "courseCode": "MATH101",
  "courseType": "Core",
  "courseStatus": "Active",
  "courseTeachers": ["teacherId1"],
  "courseClass": "classId"
}
```

### Search Classes
```bash
GET /api/admin/classes?search=10A&isActive=true
Authorization: Bearer <token>
```

## Contributing

1. Create a feature branch (`git checkout -b feature/feature-name`)
2. Commit your changes with meaningful commit messages
3. Push to the branch (`git push origin feature/feature-name`)
4. Create a Pull Request with detailed description
5. Ensure all tests pass and code follows project conventions

## License

This project is licensed under the MIT License.
