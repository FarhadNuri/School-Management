import AttendanceModel from "../../models/attendance.model.js";
import LessonModel from "../../models/lesson.model.js";
import ClassModel from "../../models/class.model.js";
import StudentModel from "../../models/student.model.js";
import {
    ATTENDANCE_STATUSES,
    assertValidObjectId,
    serializeAttendance,
    serializeLesson,
    lessonPopulate,
    attendancePopulate,
    summarizeRecords,
    getStudentName,
} from "../../utils/attendanceAccess.js";

const getOwnedLessonOrThrow = async (lessonId, teacherId) => {
    assertValidObjectId(lessonId, "lesson ID");

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

const loadClassRoster = async (classId) => {
    const classItem = await ClassModel.findById(classId)
        .select('className classCode students isActive')
        .lean();

    if (!classItem) {
        const error = new Error('Class not found for this lesson');
        error.statusCode = 404;
        throw error;
    }
    const students = await StudentModel.find({
        _id: { $in: classItem.students || [] },
    })
        .select('user class')
        .populate({
            path: 'user',
            select: 'firstName lastName photo isDeleted isActive',
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

const buildRosterResponse = (lesson, students, records) => {
    const recordByStudent = new Map(
        records.map((record) => [
            String(record.student?._id || record.student),
            record,
        ])
    );

    const roster = students.map((student) => {
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

const getLessonAttendance = async (req, res, next) => {
    try {
        const lesson = await getOwnedLessonOrThrow(
            req.params.lessonId,
            req.teacher._id
        );
        const students = await loadClassRoster(lesson.class?._id || lesson.class);
        const records = await AttendanceModel.find({ lesson: lesson._id })
            .populate(attendancePopulate)
            .lean();

        res.json(buildRosterResponse(lesson, students, records));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

const saveLessonAttendance = async (req, res, next) => {
    try {
        const lesson = await getOwnedLessonOrThrow(
            req.params.lessonId,
            req.teacher._id
        );

        const classId = lesson.class?._id || lesson.class;
        const students = await loadClassRoster(classId);
        const allowedStudentIds = new Set(
            students.map((student) => String(student._id))
        );

        const { records } = req.body || {};
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                message: 'Provide at least one attendance record to save.',
            });
        }

        const ops = [];
        const seen = new Set();
        const now = new Date();
        const lessonDate = new Date(lesson.scheduledAt);

        for (const item of records) {
            const studentId = String(item?.studentId || item?.student || '');
            const status = String(item?.status || '').trim().toLowerCase();
            const note = String(item?.note || '')
                .trim()
                .slice(0, 500);

            if (!studentId || !allowedStudentIds.has(studentId)) {
                return res.status(400).json({
                    message:
                        "One or more students are not in this lesson's class roster.",
                });
            }

            if (!ATTENDANCE_STATUSES.includes(status)) {
                return res.status(400).json({
                    message:
                        'Status must be present, absent, late, or excused.',
                });
            }

            if (seen.has(studentId)) continue;
            seen.add(studentId);

            ops.push({
                updateOne: {
                    filter: {
                        lesson: lesson._id,
                        student: studentId,
                    },
                    update: {
                        $set: {
                            lesson: lesson._id,
                            student: studentId,
                            class: classId,
                            teacher: req.teacher._id,
                            status,
                            note,
                            markedBy: req.teacher._id,
                            markedAt: now,
                            date: lessonDate,
                        },
                    },
                    upsert: true,
                },
            });
        }
        if (ops.length) {
            await AttendanceModel.bulkWrite(ops, { ordered: false });
        }

        const saved = await AttendanceModel.find({ lesson: lesson._id })
            .populate(attendancePopulate)
            .lean();

        res.json({
            message: 'Attendance saved successfully',
            ...buildRosterResponse(lesson, students, saved),
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
    }
}

const getTeacherAttendanceLessons = async (req, res, next) => {
    try {
        const lessons = await LessonModel.find({
            teacher: req.teacher._id,
            isActive: true,
        })
            .populate(lessonPopulate)
            .sort({ scheduledAt: -1 })
            .lean();

        if (!lessons.length) {
            return res.json({ count: 0, lessons: [] });
        }

        const lessonIds = lessons.map((lesson) => lesson._id);
        const aggregates = await AttendanceModel.aggregate([
            { $match: { lesson: { $in: lessonIds } } },
            {
                $group: {
                    _id: '$lesson',
                    total: { $sum: 1 },
                    present: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'present'] }, 1, 0],
                        },
                    },
                    absent: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0],
                        },
                    },
                    late: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'late'] }, 1, 0],
                        },
                    },
                    excused: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'excused'] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const statsByLesson = new Map(
            aggregates.map((item) => [String(item._id), item])
        );

        const classIds = [
            ...new Set(
                lessons
                    .map((lesson) => String(lesson.class?._id || lesson.class || ''))
                    .filter(Boolean)
            ),
        ];

        const classes = await ClassModel.find({ _id: { $in: classIds } })
            .select('students')
            .lean();

        const rosterSizeByClass = new Map(
            classes.map((classItem) => [
                String(classItem._id),
                (classItem.students || []).length,
            ])
        );

        const payload = lessons.map((lesson) => {
            const serialized = serializeLesson(lesson);
            const stats = statsByLesson.get(String(lesson._id));
            const rosterSize =
                rosterSizeByClass.get(
                    String(lesson.class?._id || lesson.class || '')
                ) || 0;
            const markedCount = stats?.total || 0;
            const attended = (stats?.present || 0) + (stats?.late || 0);

            return {
                ...serialized,
                attendance: {
                    rosterSize,
                    markedCount,
                    unmarkedCount: Math.max(0, rosterSize - markedCount),
                    present: stats?.present || 0,
                    absent: stats?.absent || 0,
                    late: stats?.late || 0,
                    excused: stats?.excused || 0,
                    attended,
                    attendanceRate: rosterSize > 0 ? (attended / rosterSize) * 100 : 0,
                    isComplete: rosterSize > 0 && markedCount === rosterSize,
                },
            };
        });

        res.json({ count: payload.length, lessons: payload });
    } catch (error) {
        next(error);
    }
};

export {
    getTeacherAttendanceLessons,
    getLessonAttendance,
    saveLessonAttendance,
};
