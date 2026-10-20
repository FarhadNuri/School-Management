import mongoose from 'mongoose';
import StudentModel from '../../models/student.model.js';
import GuardianModel from '../../models/guardian.model.js';
import PaymentModel from '../../models/payment.model.js';
import ComplaintModel from '../../models/complaint.model.js';
import { resolveAccessContext } from '../../utils/lessonAccess.js';
import { summarizeStudentAttendance } from '../../utils/attendanceAccess.js';

const COMPLAINT_STATUS_LABEL = {
    pending: 'Open',
    in_progress: 'Under Review',
    resolved: 'Resolved',
};

const COMPLAINT_SEVERITY_LABEL = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
};

const COMPLAINT_CATEGORY_LABEL = {
    bullying: 'Bullying',
    harassment: 'Harassment',
    cyberbullying: 'Cyberbullying',
    discrimination: 'Discrimination',
};

const firstEnum = (value) => {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

/* Shape complaints for the client RelatedComplaints UI. */
const serializeStudentReports = (complaints = []) =>
    complaints.map((complaint) => {
        const statusKey = String(firstEnum(complaint.status)).toLowerCase();
        const severityKey = String(firstEnum(complaint.severity)).toLowerCase();
        const categoryKey = String(firstEnum(complaint.category)).toLowerCase();

        return {
            id: String(complaint._id),
            title: complaint.title || 'Complaint',
            summary: complaint.description || '',
            involvement: 'Filed',
            priority:
                COMPLAINT_SEVERITY_LABEL[severityKey] ||
                complaint.priority ||
                'Medium',
            status:
                COMPLAINT_STATUS_LABEL[statusKey] ||
                complaint.status ||
                'Open',
            category:
                COMPLAINT_CATEGORY_LABEL[categoryKey] ||
                complaint.category ||
                'Other',
            createdAt: complaint.dateFiled || complaint.createdAt || null,
        };
    });

const studentPopulate = [
    {
        path: 'user',
        select:
            'firstName lastName email photo gender dateOfBirth address contactInfo isActive isDeleted',
    },
    {
        path: 'class',
        select: 'className classCode grade academicYear teachers',
        populate: {
            path: 'teachers',
            select: 'user',
            populate: {
                path: 'user',
                select: 'firstName lastName email photo',
            },
        },
    },
    {
        path: 'guardian',
        select: 'user',
        populate: {
            path: 'user',
            select: 'firstName lastName email photo contactInfo',
        },
    },
];

const personName = (user) => {
    if (!user || typeof user !== 'object') return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
};

const getFeeTotals = async (studentIds) => {
    if (!studentIds.length) return new Map();

    const rows = await PaymentModel.aggregate([
        {
            $match: {
                student: {
                    $in: studentIds.map(
                        (id) => new mongoose.Types.ObjectId(String(id))
                    ),
                },
                isActive: true,
                status: { $ne: 'cancelled' },
            },
        },
        {
            $group: {
                _id: '$student',
                feesPaid: { $sum: '$amountPaid' },
                feesBalance: {
                    $sum: {
                        $max: [
                            0,
                            { $subtract: ['$amount', '$amountPaid'] },
                        ],
                    },
                },
            },
        },
    ]);

    return new Map(
        rows.map((row) => [
            String(row._id),
            {
                feesPaid: Number(row.feesPaid) || 0,
                feesBalance: Number(row.feesBalance) || 0,
            },
        ])
    );
};


const serializeStudent = (student, feeTotals = {}) => {
    if (!student) return null;

    const user =
        student.user && typeof student.user === 'object' ? student.user : null;
    const classDoc =
        student.class && typeof student.class === 'object'
            ? student.class
            : null;
    const guardianDoc =
        student.guardian && typeof student.guardian === 'object'
            ? student.guardian
            : null;
    const guardianUser =
        guardianDoc?.user && typeof guardianDoc.user === 'object'
            ? guardianDoc.user
            : null;

    const teachers = Array.isArray(classDoc?.teachers)
        ? classDoc.teachers
            .map((teacher) => {
                const teacherUser =
                    teacher?.user && typeof teacher.user === 'object'
                        ? teacher.user
                        : null;
                if (!teacherUser) return null;
                return {
                    id: String(teacher._id || teacher.id || ''),
                    firstName: teacherUser.firstName || '',
                    lastName: teacherUser.lastName || '',
                    name: personName(teacherUser),
                    email: teacherUser.email || '',
                    photo: teacherUser.photo || '',
                };
            })
            .filter(Boolean)
        : [];

    const primaryTeacher = teachers[0] || null;
    const fees = feeTotals[String(student._id)] || {
        feesPaid: 0,
        feesBalance: 0,
    };

    return {
        id: String(student._id),
        _id: student._id,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        name: personName(user) || 'Student',
        email: user?.email || '',
        photo: user?.photo || '',
        gender: user?.gender || '',
        dateOfBirth: user?.dateOfBirth || null,
        phone: user?.contactInfo?.phone || '',
        isActive: user?.isActive != false,
        status: user?.isActive === false ? 'Inactive' : 'Active',
        address: {
            street: user?.address?.street || '',
            city: user?.address?.city || '',
            state: user?.address?.state || '',
            district: user?.address?.state || '',
            zip: user?.address?.zip || '',
            country: user?.address?.country || '',
        },
        contactInfo: user?.contactInfo || {},
        emergencyContact: student.emergencyContact || '',
        dateOfAdmission: student.createdAt || null,
        createdAt: student.createdAt || null,
        updatedAt: student.updatedAt || null,
        classGrade: classDoc?.className || '',
        teacher: primaryTeacher?.name || '',
        teachers,
        class: classDoc
            ? {
                id: String(classDoc._id),
                _id: classDoc._id,
                className: classDoc.className || '',
                classCode: classDoc.classCode || '',
                grade: classDoc.grade ?? null,
                academicYear: classDoc.academicYear || '',
            }
            : null,
        guardian: guardianDoc
            ? {
                id: String(guardianDoc._id),
                _id: guardianDoc._id,
                firstName: guardianUser?.firstName || '',
                lastName: guardianUser?.lastName || '',
                name: personName(guardianUser),
                email: guardianUser?.email || '',
                photo: guardianUser?.photo || '',
                phone: guardianUser?.contactInfo?.phone || '',
                user: guardianUser || undefined,
            }
            : null,
        parentGuardian: {
            name: personName(guardianUser) || '',
            email: guardianUser?.email || '',
            phone: guardianUser?.contactInfo?.phone || '',
            relationship: 'Guardian',
        },
        feesPaid: fees.feesPaid,
        feesBalance: fees.feesBalance,
        user: user || undefined,
    };
};

const resolveGuardianWardIds = async (user) => {
    const access = await resolveAccessContext(user);

    if (access.role !== 'guardian' || !access.guardianId) {
        return { access, wardIds: [] };
    }

    const guardian = await GuardianModel.findById(access.guardianId)
        .select('students')
        .lean();

    return {
        access,
        wardIds: (guardian?.students || [])
            .filter(Boolean)
            .map((id) => String(id)),
    };
};

export const getMyStudents = async (req, res, next) => {
    try {
        const { search } = req.query;
        const { access, wardIds } = await resolveGuardianWardIds(req.user);

        if (access.role !== 'guardian') {
            return res.status(403).json({
                message: 'Only guardians can view linked students',
            });
        }

        if (!wardIds.length) {
            return res.json({ count: 0, students: [] });
        }

        let students = await StudentModel.find({ _id: { $in: wardIds } })
            .select(
                '-assignments -announcements -events -resources -exams -quizzes',
            )
            .populate(studentPopulate)
            .sort({ createdAt: -1 })
            .lean();

        students = students.filter(
            (student) => student?.user && !student.user.isDeleted,
        );

        if (search?.trim()) {
            const q = search.trim().toLowerCase();
            students = students.filter((student) => {
                const haystack = [
                    student.user?.firstName,
                    student.user?.lastName,
                    student.user?.email,
                    student.class?.className,
                    student.class?.classCode,
                    String(student._id),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(q);
            });
        }

        const feeMap = await getFeeTotals(students.map((s) => s._id));
        const serialized = students.map((student) =>
            serializeStudent(student, Object.fromEntries(feeMap)),
        );

        res.json({
            count: serialized.length,
            students: serialized,
        });
    } catch (error) {
        next(error);
    }
};

export const getMyStudentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        const { access, wardIds } = await resolveGuardianWardIds(req.user);

        if (access.role !== 'guardian') {
            return res.status(403).json({
                message: 'Only guardians can view linked students',
            });
        }

        if (!wardIds.includes(String(id))) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const student = await StudentModel.findById(id)
            .select(
                '-assignments -announcements -events -resources -exams -quizzes',
            )
            .populate(studentPopulate)
            .lean();

        if (!student?.user || student.user.isDeleted) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const [feeMap, complaints, attendanceSummary] = await Promise.all([
            getFeeTotals([student._id]),
            ComplaintModel.find({ reporter: student._id })
                .sort({ dateFiled: -1, createdAt: -1 })
                .lean(),
            summarizeStudentAttendance(student._id),
        ]);

        const serialized = serializeStudent(
            student,
            Object.fromEntries(feeMap),
        );

        res.json({
            student: {
                ...serialized,
                reports: serializeStudentReports(complaints),
                attendanceSummary,
            },
        });
    } catch (error) {
        next(error);
    }
};