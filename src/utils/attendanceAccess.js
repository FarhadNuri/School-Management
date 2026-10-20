import mongoose from 'mongoose';
import AttendanceModel, { ATTENDANCE_STATUSES } from '../models/attendance.model.js';
import LessonModel from '../models/lesson.model.js';
import ClassModel from '../models/class.model.js';
import StudentModel from '../models/student.model.js';
import TeacherModel from '../models/teacher.model.js';
import GuardianModel from '../models/guardian.model.js';
import {
    assertValidObjectId,
    resolveAccessContext,
    teacherOwnsClass,
    isAssignedClass,
    getAccessibleCourses,
} from './lessonAccess.js';

const attendancePopulate = [
    {
        path: 'student',
        select: 'user class rollNumber',
        populate: {
            path: 'user',
            select: 'firstName lastName photo email isDeleted isActive',
        },
    },
    {
        path: 'lesson',
        select: 'title subject scheduledAt durationMinutes class course teacher',
        populate: [
            {
                path: 'course',
                select: 'courseName courseCode',
            },
            {
                path: 'teacher',
                select: 'user',
                populate: {
                    path: 'user',
                    select: 'firstName lastName photo email',
                },
            },
        ],
    },
    {
        path: 'class',
        select: 'className classCode grade academicYear',
    },
    {
        path: 'teacher',
        select: 'user',
        populate: {
            path: 'user',
            select: 'firstName lastName email photo',
        },
    },
    {
        path: 'markedBy',
        select: 'user',
        populate: {
            path: 'user',
            select: 'firstName lastName email photo',
        },
    },
];

const lessonPopulate = [
    {
        path: 'class',
        select: 'className classCode grade academicYear isActive teachers students',
    },
    {
        path: 'course',
        select: 'courseName courseCode courseType courseStatus courseClass',
    },
    {
        path: 'teacher',
        select: 'user',
        populate: {
            path: 'user',
            select: 'firstName lastName email photo',
        },
    },
];

const uniqueIds = (ids = []) => [
    ...new Set(
        ids
            .filter(Boolean)
            .map((id) => (id?._id || id).toString())
    ),
];

const getStudentName = (student) => {
    if (!student) return '';
    const user = student.user && typeof student.user === 'object' ? student.user : null;
    if (user) {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return `${student.firstName || ''} ${student.lastName || ''}`.trim();
};

const getTeacherName = (teacherOrLesson) => {
    if (!teacherOrLesson) return '';
    const teacher = teacherOrLesson.teacher || teacherOrLesson;
    const user = teacher?.user && typeof teacher.user === 'object' ? teacher.user : null;
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
};

const serializeAttendance = (record) => {
    if (!record) return null;
    const plain = typeof record.toObject === 'function' ? record.toObject() : { ...record };

    const studentDoc = plain.student && typeof plain.student === 'object' ? plain.student : null;
    const studentUser = studentDoc?.user && typeof studentDoc.user === 'object' ? studentDoc.user : null;

    const lessonDoc = plain.lesson && typeof plain.lesson === 'object' ? plain.lesson : null;
    const classDoc = plain.class && typeof plain.class === 'object' ? plain.class : null;
    const teacherDoc = plain.teacher && typeof plain.teacher === 'object' ? plain.teacher : null;
    const markedByDoc = plain.markedBy && typeof plain.markedBy === 'object' ? plain.markedBy : null;

    const studentId = String(studentDoc?._id || plain.student || '');
    const lessonId = String(lessonDoc?._id || plain.lesson || '');
    const classId = String(classDoc?._id || plain.class || '');
    const teacherId = String(teacherDoc?._id || plain.teacher || '');
    const markedById = String(markedByDoc?._id || plain.markedBy || '');

    return {
        id: String(plain._id || plain.id || ''),
        _id: plain._id,
        status: plain.status || null,
        note: plain.note || '',
        date: plain.date || plain.markedAt || null,
        markedAt: plain.markedAt || plain.createdAt || null,

        // Student details
        studentId: studentId || null,
        studentName: getStudentName(studentDoc) || (studentUser ? `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim() : ''),
        studentPhoto: studentUser?.photo || '',
        student: studentDoc
            ? {
                  id: studentId,
                  _id: studentDoc._id,
                  name: getStudentName(studentDoc),
                  firstName: studentUser?.firstName || '',
                  lastName: studentUser?.lastName || '',
                  photo: studentUser?.photo || '',
                  rollNumber: studentDoc.rollNumber || null,
              }
            : null,

        // Lesson details
        lessonId: lessonId || null,
        lessonTitle: lessonDoc?.title || '',
        lessonSubject: lessonDoc?.subject || '',
        scheduledAt: lessonDoc?.scheduledAt || null,
        durationMinutes: lessonDoc?.durationMinutes || null,
        lesson: lessonDoc
            ? {
                  id: lessonId,
                  _id: lessonDoc._id,
                  title: lessonDoc.title || '',
                  subject: lessonDoc.subject || '',
                  scheduledAt: lessonDoc.scheduledAt || null,
              }
            : null,

        // Class details
        classId: classId || null,
        className: classDoc?.className || '',
        classCode: classDoc?.classCode || '',
        grade: classDoc?.grade || '',
        academicYear: classDoc?.academicYear || '',
        class: classDoc
            ? {
                  id: classId,
                  _id: classDoc._id,
                  className: classDoc.className || '',
                  classCode: classDoc.classCode || '',
                  grade: classDoc.grade || '',
              }
            : null,

        // Teacher details
        teacherId: teacherId || null,
        teacherName: getTeacherName(teacherDoc),
        teacher: teacherDoc
            ? {
                  id: teacherId,
                  _id: teacherDoc._id,
                  name: getTeacherName(teacherDoc),
              }
            : null,

        // Marked By details
        markedById: markedById || null,
        markedByName: getTeacherName(markedByDoc),

        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
    };
};

const serializeLesson = (lesson) => {
    if (!lesson) return null;
    const plain = typeof lesson.toObject === 'function' ? lesson.toObject() : { ...lesson };

    return {
        _id: String(plain._id),
        id: String(plain._id),
        title: plain.title || '',
        subject: plain.subject || '',
        description: plain.description || '',
        scheduledAt: plain.scheduledAt || null,
        durationMinutes: plain.durationMinutes || null,
        notes: plain.notes || '',
        materials: plain.materials || [],
        classId: plain.class?._id || plain.class || null,
        className: plain.class?.className || '',
        classCode: plain.class?.classCode || '',
        grade: plain.class?.grade || '',
        courseId: plain.course?._id || plain.course || null,
        courseName: plain.course?.courseName || '',
        courseCode: plain.course?.courseCode || '',
        teacherId: plain.teacher?._id || plain.teacher || null,
        teacherName: getTeacherName(plain),
        isActive: plain.isActive ?? true,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

const summarizeRecords = (records = []) => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const record of records || []) {
        const status = String(record?.status || '').toLowerCase().trim();
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
    }

    const total = present + absent + late + excused;
    const attended = present + late;
    const attendanceRate = total > 0 ? Number(((attended / total) * 100).toFixed(2)) : 0;
    const presentRate = total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0;

    return {
        total,
        totalMarked: total,
        present,
        presentCount: present,
        absent,
        absentCount: absent,
        late,
        lateCount: late,
        excused,
        excusedCount: excused,
        attended,
        attendanceRate,
        presentRate,
        rate: attendanceRate,
    };
};

const summarizeStudentAttendance = async (studentId, options = {}) => {
    if (!studentId) {
        return {
            total: 0,
            totalMarked: 0,
            present: 0,
            presentCount: 0,
            absent: 0,
            absentCount: 0,
            late: 0,
            lateCount: 0,
            excused: 0,
            excusedCount: 0,
            attended: 0,
            attendanceRate: 0,
            presentRate: 0,
            rate: 0,
        };
    }

    const query = { student: studentId };

    if (options.startDate || options.endDate) {
        query.date = {};
        if (options.startDate) query.date.$gte = new Date(options.startDate);
        if (options.endDate) query.date.$lte = new Date(options.endDate);
    }

    if (options.classId) {
        query.class = options.classId;
    }

    const records = await AttendanceModel.find(query)
        .select('status date')
        .lean();

    return summarizeRecords(records);
};

const resolveGuardianWardIds = async (user, context) => {
    let guardianId = context?.guardianId;
    if (!guardianId && user?._id) {
        const guardian = await GuardianModel.findOne({ user: user._id })
            .select('_id students')
            .lean();
        return (guardian?.students || []).filter(Boolean).map((id) => String(id));
    }
    if (guardianId) {
        const guardian = await GuardianModel.findById(guardianId)
            .select('students')
            .lean();
        return (guardian?.students || []).filter(Boolean).map((id) => String(id));
    }
    return [];
};

const summarizeWardsAttendance = async (wardIds = [], options = {}) => {
    if (!Array.isArray(wardIds) || !wardIds.length) return [];

    const summaries = await Promise.all(
        wardIds.map(async (studentId) => {
            const student = await StudentModel.findById(studentId)
                .select('user class rollNumber')
                .populate({
                    path: 'user',
                    select: 'firstName lastName photo email isDeleted isActive',
                })
                .populate({
                    path: 'class',
                    select: 'className classCode grade academicYear',
                })
                .lean();

            if (!student) return null;

            const summary = await summarizeStudentAttendance(studentId, options);

            return {
                studentId: String(student._id),
                student: {
                    id: String(student._id),
                    _id: student._id,
                    name: getStudentName(student),
                    firstName: student.user?.firstName || '',
                    lastName: student.user?.lastName || '',
                    photo: student.user?.photo || '',
                    class: student.class?.className || '',
                    classCode: student.class?.classCode || '',
                    grade: student.class?.grade || '',
                    academicYear: student.class?.academicYear || '',
                },
                summary,
            };
        })
    );

    return summaries.filter(Boolean);
};

const buildAttendanceVisibilityQuery = (context, options = {}) => {
    const query = {};

    if (!context || !context.role) {
        query._id = null;
        return query;
    }

    if (context.role === 'teacher') {
        if (!context.teacherId) {
            query._id = null;
            return query;
        }
        query.teacher = context.teacherId;
    } else if (context.role === 'student') {
        if (!context.studentId) {
            query._id = null;
            return query;
        }
        query.student = context.studentId;
    } else if (context.role === 'guardian') {
        const wardIds = options.wardIds || context.wardIds || [];
        if (!wardIds.length) {
            query._id = null;
            return query;
        }
        query.student = {
            $in: wardIds.map((id) => new mongoose.Types.ObjectId(String(id))),
        };
    } else if (context.role !== 'admin') {
        query._id = null;
        return query;
    }

    if (options.startDate || options.endDate) {
        query.date = {};
        if (options.startDate) query.date.$gte = new Date(options.startDate);
        if (options.endDate) query.date.$lte = new Date(options.endDate);
    }

    if (options.status && ATTENDANCE_STATUSES.includes(options.status)) {
        query.status = options.status;
    }

    if (options.classId) {
        query.class = options.classId;
    }

    if (options.lessonId) {
        query.lesson = options.lessonId;
    }

    return query;
};

const canAccessAttendance = (attendance, context) => {
    if (!attendance || !context) return false;

    if (context.role === 'teacher') {
        const teacherId = String(context.teacherId || '');
        const attendanceTeacherId = String(attendance.teacher?._id || attendance.teacher || '');
        const markedById = String(attendance.markedBy?._id || attendance.markedBy || '');
        return attendanceTeacherId === teacherId || markedById === teacherId;
    }

    if (context.role === 'student') {
        const studentId = String(context.studentId || '');
        const attendanceStudentId = String(attendance.student?._id || attendance.student || '');
        return attendanceStudentId === studentId;
    }

    if (context.role === 'guardian') {
        const wardIds = (context.wardIds || []).map(String);
        const attendanceStudentId = String(attendance.student?._id || attendance.student || '');
        return wardIds.includes(attendanceStudentId);
    }

    if (context.role === 'admin') return true;

    return false;
};

const canAccessLessonAttendance = (lesson, context) => {
    if (!lesson || !context) return false;

    if (context.role === 'teacher') {
        const teacherId = String(context.teacherId || '');
        const lessonTeacherId = String(lesson.teacher?._id || lesson.teacher || '');
        if (lessonTeacherId && lessonTeacherId === teacherId) return true;

        const classItem = lesson.class && typeof lesson.class === 'object' ? lesson.class : null;
        if (classItem && teacherOwnsClass(classItem, teacherId)) return true;

        return false;
    }

    if (context.role === 'student' || context.role === 'guardian') {
        const classId = String(lesson.class?._id || lesson.class || '');
        return (context.classIds || []).includes(classId);
    }

    if (context.role === 'admin') return true;

    return false;
};

const resolveAttendanceStudentScope = async (user, context) => {
    const access = context || (await resolveAccessContext(user));
    const role = access?.role || user?.role;

    if (role === 'teacher' || role === 'admin') {
        return {
            all: true,
            studentIds: [],
            role,
        };
    }

    if (role === 'student') {
        let studentId = access?.studentId ? String(access.studentId) : null;
        if (!studentId && user?._id) {
            const student = await StudentModel.findOne({ user: user._id })
                .select('_id')
                .lean();
            if (student?._id) studentId = String(student._id);
        }
        return {
            all: false,
            studentIds: studentId ? [studentId] : [],
            role: 'student',
        };
    }

    if (role === 'guardian') {
        const wardIds = await resolveGuardianWardIds(user, access);
        return {
            all: false,
            studentIds: wardIds,
            role: 'guardian',
        };
    }

    return {
        all: false,
        studentIds: [],
        role: role || null,
    };
};

const filterAttendanceByScope = (records = [], scope) => {
    if (!Array.isArray(records)) return [];
    if (!scope || scope.all === true) return records;

    let allowedIds = [];
    if (Array.isArray(scope)) {
        allowedIds = scope.map((id) => String(id));
    } else if (Array.isArray(scope.studentIds)) {
        allowedIds = scope.studentIds.map((id) => String(id));
    } else if (scope.studentId) {
        allowedIds = [String(scope.studentId)];
    }

    const allowedSet = new Set(allowedIds);
    return records.filter((rec) => {
        const id = String(rec?.studentId || rec?.student?._id || rec?.student?.id || rec?.student || rec?._id || '');
        return allowedSet.has(id);
    });
};

const loadClassRoster = async (classId) => {
    if (!classId) return [];

    const classItem = await ClassModel.findById(classId)
        .select('className classCode students isActive')
        .lean();

    if (!classItem) return [];

    const studentIds = uniqueIds(classItem.students || []);
    if (!studentIds.length) return [];

    const students = await StudentModel.find({
        _id: { $in: studentIds },
    })
        .populate({
            path: 'user',
            select: 'firstName lastName photo email isDeleted isActive',
        })
        .lean();

    return students
        .filter((student) => student?.user && !student.user.isDeleted)
        .sort((a, b) =>
            getStudentName(a).localeCompare(getStudentName(b), undefined, {
                sensitivity: 'base',
            })
        );
};

const buildRosterResponse = (lesson, students = [], records = []) => {
    const recordByStudent = new Map(
        (records || []).map((record) => [
            String(record.student?._id || record.student),
            record,
        ])
    );

    const roster = (students || []).map((student) => {
        const existing = recordByStudent.get(String(student._id));
        const serialized = existing ? serializeAttendance(existing) : null;

        return {
            studentId: String(student._id),
            firstName: student.user?.firstName || '',
            lastName: student.user?.lastName || '',
            name: getStudentName(student),
            photo: student.user?.photo || '',
            status: serialized?.status || null,
            note: serialized?.note || '',
            attendanceId: serialized?.id || null,
            markedAt: serialized?.markedAt || null,
        };
    });

    const marked = roster.filter((item) => item.status);
    const summary = summarizeRecords(marked);

    return {
        lesson: serializeLesson(lesson),
        roster,
        summary: {
            ...summary,
            rosterSize: roster.length,
            markedCount: marked.length,
            unmarkedCount: roster.length - marked.length,
            isComplete: roster.length > 0 && marked.length === roster.length,
        },
    };
};

const getOwnedLessonOrThrow = async (lessonId, teacherId) => {
    assertValidObjectId(lessonId, 'lesson ID');

    const lesson = await LessonModel.findOne({
        _id: lessonId,
        teacher: teacherId,
        isActive: true,
    })
        .populate(lessonPopulate)
        .lean();

    if (!lesson) {
        const error = new Error('Lesson not found');
        error.statusCode = 404;
        throw error;
    }

    return lesson;
};

export {
    ATTENDANCE_STATUSES,
    attendancePopulate,
    lessonPopulate,
    assertValidObjectId,
    serializeAttendance,
    serializeLesson,
    getStudentName,
    getTeacherName,
    uniqueIds,
    summarizeRecords,
    summarizeStudentAttendance,
    summarizeWardsAttendance,
    resolveGuardianWardIds,
    buildAttendanceVisibilityQuery,
    canAccessAttendance,
    canAccessLessonAttendance,
    resolveAttendanceStudentScope,
    filterAttendanceByScope,
    resolveAccessContext,
    teacherOwnsClass,
    isAssignedClass,
    getAccessibleCourses,
    loadClassRoster,
    buildRosterResponse,
    getOwnedLessonOrThrow,
};
