import mongoose from 'mongoose';
import { assertValidObjectId, resolveAccessContext, getAccessibleCourses } from './lessonAccess.js';
import StudentModel from '../models/student.model.js';
import ClassModel from '../models/class.model.js';
import GuardianModel from '../models/guardian.model.js';

const examPopulate = [
    {
        path: 'class',
        select: 'className classCode grade academicYear isActive teachers students',
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
        path: 'results.student',
        select: 'user class',
        populate: {
            path: 'user',
            select: 'firstName lastName photo isDeleted isActive',
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
    const user = student?.user && typeof student.user === 'object' ? student.user : null;
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
};

const buildExamVisibilityQuery = (context) => {
    const query = { isActive: true };

    if (context.role === 'teacher') {
        if (!context.teacherId) {
            query._id = null;
            return query;
        }
        query.teacher = context.teacherId;
        return query;
    }

    if (!context.classIds.length) {
        query._id = null;
        return query;
    }

    query.class = {
        $in: context.classIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
    return query;
};

const canAccessExam = (exam, context) => {
    if (!exam || !context) return false;

    if (context.role === 'teacher') {
        return String(exam.teacher) === String(context.teacherId);
    }

    if (context.role === 'student') {
        return context.classIds.includes(String(exam.class));
    }

    if (context.role === 'guardian') {
        return context.classIds.includes(String(exam.class));
    }

    return false;
};

const serializeExam = (exam) => {
    const plain = typeof exam.toObject === 'function' ? exam.toObject() : { ...exam };

    return {
        id: String(exam._id),
        _id: exam._id,
        title: exam.title || '',
        description: exam.description || '',
        examDate: exam.examDate || null,
        startTime: exam.startTime || null,
        endTime: exam.endTime || null,
        duration: exam.duration || null,
        totalMarks: exam.totalMarks || null,
        passMarks: exam.passMarks ?? exam.passingMarks ?? null,
        passingMarks: exam.passingMarks ?? exam.passMarks ?? null,
        examType: exam.examType || '',

        // Class info
        classId: exam.class?._id || null,
        className: exam.class?.className || '',
        classCode: exam.class?.classCode || '',
        grade: exam.class?.grade || '',

        // Teacher info
        teacherId: exam.teacher?._id || null,
        teacherName: `${exam.teacher?.user?.firstName || ''} ${exam.teacher?.user?.lastName || ''}`.trim(),

        // Results (only for teachers)
        results: exam.results || [],
        students: exam.class?.students || [],

        isActive: exam.isActive ?? true,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
    };
};

const loadClassStudents = async (classId) => {
    if (!classId) return [];

    const classItem = await ClassModel.findById(classId)
        .select('students')
        .lean();

    const studentIds = uniqueIds([
        ...(classItem?.students || []),
    ]);

    if (!studentIds.length) return [];

    const students = await StudentModel.find({
        _id: { $in: studentIds },
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

const serializeResultRow = (student, result, totalMarks = 0, passingMarks = 0) => {
    const studentId = String(student?._id || student?.id || '');
    const user = student?.user && typeof student.user === 'object' ? student.user : null;
    const name = getStudentName(student) || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';
    const firstName = user?.firstName || student?.firstName || '';
    const lastName = user?.lastName || student?.lastName || '';
    const photo = user?.photo || student?.photo || '';

    const hasResult = Boolean(result);
    const isAbsent = Boolean(result?.isAbsent);
    const marksObtained = hasResult && !isAbsent && result?.marksObtained != null
        ? Number(result.marksObtained)
        : (isAbsent ? 0 : null);

    const percentage = marksObtained != null && totalMarks > 0
        ? Number(((marksObtained / totalMarks) * 100).toFixed(2))
        : null;

    const passed = isAbsent
        ? false
        : marksObtained != null
            ? marksObtained >= passingMarks
            : null;

    let status = 'pending';
    if (isAbsent) {
        status = 'absent';
    } else if (marksObtained != null) {
        status = passed ? 'passed' : 'failed';
    }

    return {
        studentId,
        student: {
            id: studentId,
            _id: student?._id,
            firstName,
            lastName,
            name,
            photo,
        },
        firstName,
        lastName,
        name,
        photo,
        marksObtained: hasResult ? (result?.marksObtained ?? null) : null,
        totalMarks,
        passingMarks,
        percentage,
        grade: result?.grade || '',
        remarks: result?.remarks || '',
        isAbsent,
        passed,
        status,
        isGraded: hasResult,
    };
};

const buildResultsRoster = (exam, students = []) => {
    const totalMarks = Number(exam.totalMarks) || 0;
    const passingMarks = Number(exam.passingMarks) || 0;

    const resultByStudent = new Map();
    for (const result of exam.results || []) {
        const studentDoc =
            result.student && typeof result.student === 'object'
                ? result.student
                : null;
        const studentId = String(studentDoc?._id || result.student || '');
        if (!studentId) continue;
        resultByStudent.set(studentId, result);
    }

    return students.map((student) =>
        serializeResultRow(
            student,
            resultByStudent.get(String(student._id)),
            totalMarks,
            passingMarks
        )
    );
};

const summarizeResults = (results = []) => {
    if (!Array.isArray(results) || results.length === 0) {
        return {
            totalStudents: 0,
            total: 0,
            gradedCount: 0,
            ungradedCount: 0,
            presentCount: 0,
            appeared: 0,
            absentCount: 0,
            absent: 0,
            passedCount: 0,
            passed: 0,
            failedCount: 0,
            failed: 0,
            passRate: 0,
            passPercentage: 0,
            averageMarks: 0,
            average: 0,
            highestMarks: 0,
            highest: 0,
            lowestMarks: 0,
            lowest: 0,
            averagePercentage: 0,
            grades: {},
            gradeDistribution: {},
        };
    }

    const totalStudents = results.length;
    let gradedCount = 0;
    let absentCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    const grades = {};
    const presentMarks = [];
    const percentages = [];

    for (const row of results) {
        const isAbsent = Boolean(row.isAbsent);
        const hasResult = Boolean(row.isGraded || row.marksObtained != null || isAbsent);

        if (hasResult) {
            gradedCount++;
        }

        if (isAbsent) {
            absentCount++;
            failedCount++;
        } else if (row.marksObtained != null) {
            const marks = Number(row.marksObtained);
            presentMarks.push(marks);

            if (row.percentage != null) {
                percentages.push(Number(row.percentage));
            }

            if (row.passed === true || row.status === 'passed') {
                passedCount++;
            } else if (row.passed === false || row.status === 'failed') {
                failedCount++;
            }
        }

        if (row.grade) {
            const g = String(row.grade).trim();
            if (g) {
                grades[g] = (grades[g] || 0) + 1;
            }
        }
    }

    const presentCount = presentMarks.length;
    const ungradedCount = totalStudents - gradedCount;
    const totalMarksSum = presentMarks.reduce((sum, val) => sum + val, 0);
    const averageMarks = presentCount > 0 ? Number((totalMarksSum / presentCount).toFixed(2)) : 0;
    const highestMarks = presentCount > 0 ? Math.max(...presentMarks) : 0;
    const lowestMarks = presentCount > 0 ? Math.min(...presentMarks) : 0;

    const totalPctSum = percentages.reduce((sum, val) => sum + val, 0);
    const averagePercentage = percentages.length > 0 ? Number((totalPctSum / percentages.length).toFixed(2)) : 0;
    const passRate = presentCount > 0 ? Number(((passedCount / presentCount) * 100).toFixed(2)) : 0;

    return {
        totalStudents,
        total: totalStudents,
        gradedCount,
        ungradedCount,
        presentCount,
        appeared: presentCount,
        absentCount,
        absent: absentCount,
        passedCount,
        passed: passedCount,
        failedCount,
        failed: failedCount,
        passRate,
        passPercentage: passRate,
        averageMarks,
        average: averageMarks,
        highestMarks,
        highest: highestMarks,
        lowestMarks,
        lowest: lowestMarks,
        averagePercentage,
        grades,
        gradeDistribution: grades,
    };
};

const resolveExamStudentScope = async (user, context) => {
    const access = context || (await resolveAccessContext(user));
    const role = access?.role || user?.role;

    // Teachers and Admins have access to the full class roster
    if (role === 'teacher' || role === 'admin') {
        return {
            all: true,
            studentIds: [],
            role,
        };
    }

    // Students only have access to their own result
    if (role === 'student') {
        let studentId = access?.studentId ? String(access.studentId) : null;
        if (!studentId && user?._id) {
            const student = await StudentModel.findOne({ user: user._id })
                .select('_id')
                .lean();
            if (student?._id) {
                studentId = String(student._id);
            }
        }
        return {
            all: false,
            studentIds: studentId ? [studentId] : [],
            role: 'student',
        };
    }

    // Guardians only have access to their linked wards
    if (role === 'guardian') {
        let guardianId = access?.guardianId;
        if (!guardianId && user?._id) {
            const guardian = await GuardianModel.findOne({ user: user._id })
                .select('_id')
                .lean();
            guardianId = guardian?._id;
        }

        let wardIds = [];
        if (guardianId) {
            const guardian = await GuardianModel.findById(guardianId)
                .select('students')
                .lean();
            wardIds = (guardian?.students || [])
                .filter(Boolean)
                .map((id) => String(id));
        }

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

const filterRosterByScope = (fullRoster = [], scope) => {
    if (!Array.isArray(fullRoster)) return [];
    if (!scope || scope.all === true) return fullRoster;

    let allowedIds = [];
    if (Array.isArray(scope)) {
        allowedIds = scope.map((id) => String(id));
    } else if (Array.isArray(scope.studentIds)) {
        allowedIds = scope.studentIds.map((id) => String(id));
    } else if (scope.studentId) {
        allowedIds = [String(scope.studentId)];
    }

    const allowedSet = new Set(allowedIds);
    return fullRoster.filter((row) => {
        const id = String(row?.studentId || row?.student?._id || row?.student?.id || row?.student || row?._id || '');
        return allowedSet.has(id);
    });
};

export {
    examPopulate,
    assertValidObjectId,
    buildExamVisibilityQuery,
    canAccessExam,
    serializeExam,
    loadClassStudents,
    buildResultsRoster,
    serializeResultRow,
    getStudentName,
    uniqueIds,
    summarizeResults,
    resolveExamStudentScope,
    filterRosterByScope,
    getAccessibleCourses,
    resolveAccessContext,
};