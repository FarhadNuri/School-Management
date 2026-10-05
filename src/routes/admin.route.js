import { Router } from "express";   
import {loginAdmin} from '../controllers/admin/admin.controller.js'
import { admminProtector } from "../middleware/admin.middleware.js";
import { getMe,changePassword,getAdminDashboard,updateMyPhoto } from "../controllers/admin/admin.controller.js";
const router = Router()

//public
router.post('/login',loginAdmin)

//protected
router.use(admminProtector)


router.get('/me',getMe)
router.patch('/me',changePassword)
router.get('/me',getAdminDashboard)
router.patch('/me',updateMyPhoto)


export default router