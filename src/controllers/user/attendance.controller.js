import mongoose from 'mongoose';
import AttendanceModel from '../../models/attendance.model.js';
import LessonModel from '../../models/lesson.model.js';
import {
    assertValidObjectId,
    serializeAttendance,
    lessonPopulate,
    attendancePopulate,
    summarizeRecords,
    summarizeStudentAttendance,
    summarizeWardsAttendance,
    resolveGuardianWardIds,
    buildAttendanceVisibilityQuery,
    canAccessLessonAttendance,
    resolveAccessContext,
    loadClassRoster,
    buildRosterResponse,
} from '../../utils/attendanceAccess.js';

/**
 * GET /attendance
 * Fetches attendance records accessible to the authenticated user.
 * - Students see their own attendance records.
 * - Guardians see their wards' attendance records (can filter by specific ward via ?studentId=).
 * - Teachers see attendance records for their classes/lessons.
 */
export const getMyAttendance = async (req, res, next) => {
    try {
        const context = await resolveAccessContext(req.user);
        const { status, startDate, endDate, classId, lessonId, studentId } = req.query;

        let wardIds = [];
        if (context.role === 'guardian') {
            wardIds = await resolveGuardianWardIds(req.user, context);
            if (!wardIds.length) {
                return res.json({ count: 0, attendance: [] });
            }

            // If guardian specified a studentId, ensure it belongs to their wards
            if (studentId) {
                if (!wardIds.includes(String(studentId))) {
                    return res.status(403).json({
                        message: 'You can only view attendance for your linked wards.',
                    });
                }
                wardIds = [String(studentId)];
            }
        }

        const query = buildAttendanceVisibilityQuery(context, {
            status,
            startDate,
            endDate,
            classId,
            lessonId,
            wardIds,
        });

        if (query._id === null) {
            return res.json({ count: 0, attendance: [] });
        }

        const records = await AttendanceModel.find(query)
            .populate(attendancePopulate)
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const serialized = records.map(serializeAttendance);

        res.json({
            count: serialized.length,
            attendance: serialized,
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * GET /attendance/summary
 * Returns overall attendance statistics (present, absent, late, excused, attendanceRate).
 * - Students: summary of their personal attendance.
 * - Guardians: overall summary across all wards, plus breakdown per ward (?studentId= filters single ward).
 * - Teachers: summary across their classes/lessons.
 */
export const getMyAttendanceSummary = async (req, res, next) => {
    try {
        const context = await resolveAccessContext(req.user);
        const { startDate, endDate, classId, studentId } = req.query;
        const options = { startDate, endDate, classId };

        if (context.role === 'student') {
            if (!context.studentId) {
                return res.json({
                    studentId: null,
                    summary: summarizeRecords([]),
                });
            }

            const summary = await summarizeStudentAttendance(context.studentId, options);
            return res.json({
                studentId: String(context.studentId),
                summary,
            });
        }

        if (context.role === 'guardian') {
            const wardIds = await resolveGuardianWardIds(req.user, context);
            if (!wardIds.length) {
                return res.json({
                    summary: summarizeRecords([]),
                    wards: [],
                });
            }

            // If a specific ward was queried
            if (studentId) {
                if (!wardIds.includes(String(studentId))) {
                    return res.status(403).json({
                        message: 'You can only view attendance for your linked wards.',
                    });
                }

                const summary = await summarizeStudentAttendance(studentId, options);
                return res.json({
                    studentId: String(studentId),
                    summary,
                });
            }

            const [wardSummaries, overallRecords] = await Promise.all([
                summarizeWardsAttendance(wardIds, options),
                AttendanceModel.find({
                    student: {
                        $in: wardIds.map((id) => new mongoose.Types.ObjectId(String(id))),
                    },
                    ...(startDate || endDate
                        ? {
                              date: {
                                  ...(startDate ? { $gte: new Date(startDate) } : {}),
                                  ...(endDate ? { $lte: new Date(endDate) } : {}),
                              },
                          }
                        : {}),
                    ...(classId ? { class: classId } : {}),
                })
                    .select('status date')
                    .lean(),
            ]);

            return res.json({
                summary: summarizeRecords(overallRecords),
                wards: wardSummaries,
            });
        }

        if (context.role === 'teacher') {
            const query = buildAttendanceVisibilityQuery(context, options);
            if (query._id === null) {
                return res.json({ summary: summarizeRecords([]) });
            }

            const records = await AttendanceModel.find(query)
                .select('status date')
                .lean();

            return res.json({ summary: summarizeRecords(records) });
        }

        res.json({ summary: summarizeRecords([]) });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * GET /attendance/wards
 * Returns attendance summary breakdown for all wards linked to the authenticated guardian.
 */
export const getMyAttendanceWards = async (req, res, next) => {
    try {
        const context = await resolveAccessContext(req.user);

        if (context.role !== 'guardian') {
            return res.status(403).json({
                message: 'Only guardians can view linked ward attendance.',
            });
        }

        const wardIds = await resolveGuardianWardIds(req.user, context);
        if (!wardIds.length) {
            return res.json({ count: 0, wards: [] });
        }

        const { startDate, endDate, classId } = req.query;
        const wardSummaries = await summarizeWardsAttendance(wardIds, {
            startDate,
            endDate,
            classId,
        });

        res.json({
            count: wardSummaries.length,
            wards: wardSummaries,
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * GET /attendance/lessons/:lessonId
 * Fetches attendance for a specific lesson:
 * - Students: see their own attendance status/notes for the lesson.
 * - Guardians: see their linked wards' attendance records for the lesson.
 * - Teachers: see the full class attendance roster and completion status.
 */
export const getMyLessonAttendance = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        assertValidObjectId(lessonId, 'lesson ID');

        const context = await resolveAccessContext(req.user);
        const lesson = await LessonModel.findOne({
            _id: lessonId,
            isActive: true,
        })
            .populate(lessonPopulate)
            .lean();

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        if (!canAccessLessonAttendance(lesson, context)) {
            return res.status(403).json({
                message: 'Access denied to this lesson attendance.',
            });
        }

        const classId = lesson.class?._id || lesson.class;
        const students = await loadClassRoster(classId);
        const records = await AttendanceModel.find({ lesson: lesson._id })
            .populate(attendancePopulate)
            .lean();

        const fullResponse = buildRosterResponse(lesson, students, records);

        // Student perspective: return personal attendance entry and lesson info
        if (context.role === 'student') {
            const myEntry =
                fullResponse.roster.find(
                    (item) => String(item.studentId) === String(context.studentId)
                ) || null;

            return res.json({
                lesson: fullResponse.lesson,
                attendance: myEntry,
                myAttendance: myEntry,
            });
        }

        // Guardian perspective: return only linked wards' records and summary
        if (context.role === 'guardian') {
            const wardIds = await resolveGuardianWardIds(req.user, context);
            const wardSet = new Set(wardIds.map(String));
            const wardRoster = fullResponse.roster.filter((item) =>
                wardSet.has(String(item.studentId))
            );
            const markedWards = wardRoster.filter((item) => item.status);
            const summary = summarizeRecords(markedWards);

            return res.json({
                lesson: fullResponse.lesson,
                roster: wardRoster,
                summary: {
                    ...summary,
                    rosterSize: wardRoster.length,
                    markedCount: markedWards.length,
                    unmarkedCount: wardRoster.length - markedWards.length,
                    isComplete:
                        wardRoster.length > 0 &&
                        markedWards.length === wardRoster.length,
                },
            });
        }

        // Teacher / Admin perspective: return complete roster and summary
        res.json(fullResponse);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};