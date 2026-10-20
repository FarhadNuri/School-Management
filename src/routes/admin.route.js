import { Router } from "express";   
import {loginAdmin} from '../controllers/admin/admin.controller.js'
import { admminProtector } from "../middleware/admin.middleware.js";
import { getMe,changePassword,updateMyPhoto } from "../controllers/admin/admin.controller.js";
import { handleClassUpload, handleUserPhotoUpload } from "../middleware/multer.middleware.js";
import { getAdminDashboard } from "../controllers/admin/dashboard.controller.js";
import { addAnnouncement, getAnnouncements, updateAnnouncement, getAnnouncementById } from "../controllers/admin/announcement.controller.js";
import {addClass, getClasses, getClassById, updateClass} from "../controllers/admin/class.controller.js"
import {getComplaints, getComplaintById} from "../controllers/admin/complaint.controller.js"
import { addCourse, getCourses, getCourseById, updateCourse } from "../controllers/admin/course.controller.js";
import {addStudent, getStudents, getStudentById, setStudentStatus, updateStudent} from '../controllers/admin/student.controller.js'
import {getGuardianById, getGuardians, setGuardianStatus, updateGuardian} from '../controllers/admin/guardian.controller.js'
import {addTeacher, getTeachers, getTeacherById, setTeacherStatus, updateTeacher} from '../controllers/admin/teacher.controller.js'
import {createInvoice, getPayments, getPaymentById, updatePayment, resendInvoice, cancelPayment} from '../controllers/admin/payment.controller.js'
import { handleStudentUpload, handleTeacherUpload   } from "../middleware/multer.middleware.js";

const router = Router()

//public
router.post('/login',loginAdmin)

//protected
router.use(admminProtector)

//admin profile
router.get('/me',getMe)
router.patch('/me/password',changePassword)
router.get('/me',getAdminDashboard)
router.patch('/me/photo',handleUserPhotoUpload, updateMyPhoto)

//admin announcements
router.post('/announcements',addAnnouncement)
router.get('/announcements',getAnnouncements)
router.get('/announcements/:id',getAnnouncementById)
router.patch('/announcements/:id',updateAnnouncement)


//class routes
router.post('/classes',handleClassUpload,addClass)
router.get('/classes',getClasses)
router.get('/classes/:id',getClassById)
router.patch('/classes/:id',handleClassUpload,updateClass)

//complaint route
router.get('/complaints',getComplaints)
router.get('/complaints/:id',getComplaintById)

//course routes
router.post('/courses',addCourse)
router.get('/courses',getCourses)
router.get('/courses/:id',getCourseById)
router.patch('/courses/:id',updateCourse)


// STUDENT ROUTES FOR admin
router.post('/students', handleStudentUpload, addStudent);
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.patch('/students/:id', setStudentStatus);
router.patch('/students/:id', handleStudentUpload, updateStudent);

// GUARDIAN ROUTES for admin
router.get('/guardians', getGuardians);
router.get('/guardians/:id', getGuardianById);
router.patch('/guardians/:id/status', setGuardianStatus);
router.patch('/guardians/:id', updateGuardian);

// TEACHER ROUTES for admin
router.post('/teachers', handleTeacherUpload, addTeacher);
router.get('/teachers', getTeachers);
router.get('/teachers/:id', getTeacherById);
router.patch('/teachers/:id/status', setTeacherStatus);
router.patch('/teachers/:id', handleTeacherUpload, updateTeacher);


// PAYMENT / INVOICE ROUTES for admin
router.post('/payments', createInvoice);
router.get('/payments', getPayments);
router.get('/payments/:id', getPaymentById);
router.patch('/payments/:id', updatePayment);
router.post('/payments/:id/resend', resendInvoice);
router.post('/payments/:id/cancel', cancelPayment);


export default router