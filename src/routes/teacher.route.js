import { Router } from "express";
import {
    getTeacherClasses,
    getTeacherClassById,
    getTeacherGuardians,
    getTeacherGuardianById,
} from "../controllers/teacher/teacher.controller.js";
import {
    createLesson,
    updateLesson,
    getTeacherLessons,
    getTeacherLessonById,
} from "../controllers/teacher/lesson.controller.js";
import {
    createHomework,
    updateHomework,
    getTeacherHomeworks,
    getTeacherHomeworkById,
} from "../controllers/teacher/homework.controller.js";
import {
    createExam,
    updateExam,
    getTeacherExams,
    getTeacherExamById,
    saveExamResults,
} from "../controllers/teacher/exam.controller.js";
import {
    getLessonAttendance,
    saveLessonAttendance,
    getTeacherAttendanceLessons,
} from "../controllers/teacher/attendance.controller.js";
import { protectTeacher } from "../middleware/teacher.middleware.js";
import {
    handleLessonUpload,
    handleHomeworkUpload,
} from "../middleware/multer.middleware.js";

const router = Router();

router.use(protectTeacher);

router.get("/classes", getTeacherClasses);
router.get("/classes/:id", getTeacherClassById);
router.get("/guardians", getTeacherGuardians);
router.get("/guardians/:id", getTeacherGuardianById);

router.get("/lessons", getTeacherLessons);
router.post('/lessons', handleLessonUpload, createLesson);
router.get('/lessons/:id', getTeacherLessonById);
router.patch('/lessons/:id', handleLessonUpload, updateLesson);

router.get('/homeworks', getTeacherHomeworks);
router.post('/homeworks', handleHomeworkUpload, createHomework);
router.get('/homeworks/:id', getTeacherHomeworkById);
router.patch('/homeworks/:id', handleHomeworkUpload, updateHomework);

router.get('/exams', getTeacherExams);
router.post('/exams', createExam);
router.get('/exams/:id', getTeacherExamById);
router.patch('/exams/:id', updateExam);
router.put('/exams/:id/results', saveExamResults);

router.get('/attendance/lessons', getTeacherAttendanceLessons);
router.get('/attendance/lessons/:lessonId', getLessonAttendance);
router.put('/attendance/lessons/:lessonId', saveLessonAttendance);

export default router;