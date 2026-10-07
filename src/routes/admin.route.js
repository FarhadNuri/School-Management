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


export default router