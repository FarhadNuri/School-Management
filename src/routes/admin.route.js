import { Router } from "express";   
import {loginAdmin} from '../controllers/admin/admin.controller.js'
import { admminProtector } from "../middleware/admin.middleware.js";
import { getMe,changePassword,updateMyPhoto } from "../controllers/admin/admin.controller.js";
import { handleUserPhotoUpload } from "../middleware/multer.middleware.js";
import { getAdminDashboard } from "../controllers/admin/dashboard.controller.js";
import { addAnnouncement, getAnnouncements, updateAnnouncement, getAnnouncementById } from "../controllers/admin/announcement.controller.js";

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

export default router