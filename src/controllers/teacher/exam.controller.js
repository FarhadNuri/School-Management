import mongoose from 'mongoose';
import ExamModel from '../../models/exam.model.js';
import ClassModel from '../../models/class.model.js';
import { assertValidObjectId, isAssignedClass } from '../../utils/lessonAccess.js';
import {
  examPopulate,
  serializeExam,
  loadClassStudents,
  buildResultsRoster,
  summarizeResults,
} from '../../utils/examAccess.js';
import { escapeRegex } from '../../utils/userHelpers.js';

const EXAM_TYPES = ['midterm', 'final', 'quiz', 'unit_test', 'other'];
const EXAM_STATUSES = ['scheduled', 'ongoing', 'completed', 'cancelled'];

const toBoundedText = (value, maxLength) => {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  return String(raw ?? '')
    .trim()
    .slice(0, maxLength);
};

const calculateGrade = (marksObtained, totalMarks) => {
  if (totalMarks <= 0) return '';
  const percentage = (marksObtained / totalMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

const getAssignedClassOrThrow = async (classId, teacher) => {
  assertValidObjectId(classId, 'class ID');

  const classItem = await ClassModel.findById(classId)
    .select('className classCode grade academicYear isActive teachers students courses')
    .lean();

  if (!classItem) {
    const error = new Error('Class not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isAssignedClass(classItem, teacher)) {
    const error = new Error('Access denied. This class is not assigned to you.');
    error.statusCode = 403;
    throw error;
  }

  return classItem;
};

/**
 * GET /exams
 * Lists all exams created by or assigned to the authenticated teacher.
 * Supports filters: classId, examType, status, startDate, endDate, search.
 */
export const getTeacherExams = async (req, res, next) => {
  try {
    const { classId, examType, status, startDate, endDate, search } = req.query;

    const filter = {
      teacher: req.teacher._id,
      isActive: true,
    };

    if (classId) {
      assertValidObjectId(classId, 'class ID');
      filter.class = classId;
    }

    if (examType && EXAM_TYPES.includes(examType.toLowerCase())) {
      filter.examType = examType.toLowerCase();
    }

    if (status && EXAM_STATUSES.includes(status.toLowerCase())) {
      filter.status = status.toLowerCase();
    }

    if (startDate || endDate) {
      filter.examDate = {};
      if (startDate) filter.examDate.$gte = new Date(startDate);
      if (endDate) filter.examDate.$lte = new Date(endDate);
    }

    if (search?.trim()) {
      const term = search.trim();
      const regex = new RegExp(escapeRegex(term), 'i');
      filter.$or = [{ title: regex }, { subject: regex }, { venue: regex }];
    }

    const exams = await ExamModel.find(filter)
      .populate(examPopulate)
      .sort({ examDate: -1, startTime: -1 })
      .lean();

    const serialized = exams.map((exam) => {
      const item = serializeExam(exam);
      item.resultsCount = (exam.results || []).length;
      return item;
    });

    res.json({
      count: serialized.length,
      exams: serialized,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * POST /exams
 * Creates a new exam for a class assigned to the teacher.
 */
export const createExam = async (req, res, next) => {
  try {
    const {
      title,
      description,
      subject,
      examType,
      classId,
      examDate,
      startTime,
      endTime,
      duration,
      venue,
      totalMarks,
      passingMarks,
      instructions,
      status,
    } = req.body || {};

    const cleanTitle = toBoundedText(title, 100);
    if (!cleanTitle) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const cleanSubject = toBoundedText(subject, 50);
    if (!cleanSubject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!examDate) {
      return res.status(400).json({ message: 'Exam date is required' });
    }
    const parsedDate = new Date(examDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid exam date' });
    }

    if (!startTime || !String(startTime).trim()) {
      return res.status(400).json({ message: 'Start time is required' });
    }

    if (!endTime || !String(endTime).trim()) {
      return res.status(400).json({ message: 'End time is required' });
    }

    const parsedTotal = Number(totalMarks);
    if (totalMarks === undefined || Number.isNaN(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ message: 'Total marks must be a positive number' });
    }

    const parsedPassing = Number(passingMarks);
    if (passingMarks === undefined || Number.isNaN(parsedPassing) || parsedPassing < 0) {
      return res.status(400).json({ message: 'Passing marks must be a positive number' });
    }

    if (parsedPassing > parsedTotal) {
      return res.status(400).json({ message: 'Passing marks cannot exceed total marks' });
    }

    const parsedDuration = Number(duration);
    if (duration !== undefined && (Number.isNaN(parsedDuration) || parsedDuration < 1)) {
      return res.status(400).json({ message: 'Duration must be at least 1 minute' });
    }

    const classItem = await getAssignedClassOrThrow(classId || req.body.class, req.teacher);

    const type = examType && EXAM_TYPES.includes(String(examType).toLowerCase())
      ? String(examType).toLowerCase()
      : 'other';

    const examStatus = status && EXAM_STATUSES.includes(String(status).toLowerCase())
      ? String(status).toLowerCase()
      : 'scheduled';

    const exam = await ExamModel.create({
      title: cleanTitle,
      description: toBoundedText(description, 500),
      subject: cleanSubject,
      examType: type,
      class: classItem._id,
      teacher: req.teacher._id,
      students: classItem.students || [],
      examDate: parsedDate,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      duration: parsedDuration || 60,
      venue: toBoundedText(venue, 100),
      totalMarks: parsedTotal,
      passingMarks: parsedPassing,
      instructions: toBoundedText(instructions, 2000),
      status: examStatus,
      results: [],
    });

    const populated = await ExamModel.findById(exam._id)
      .populate(examPopulate)
      .lean();

    res.status(201).json({
      message: 'Exam created successfully',
      exam: serializeExam(populated),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * GET /exams/:id
 * Fetches an exam owned by the teacher along with class roster results and statistical summary.
 */
export const getTeacherExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    assertValidObjectId(id, 'exam ID');

    const exam = await ExamModel.findOne({
      _id: id,
      teacher: req.teacher._id,
      isActive: true,
    })
      .populate(examPopulate)
      .lean();

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const classId = exam.class?._id || exam.class;
    const students = await loadClassStudents(classId);
    const results = buildResultsRoster(exam, students);
    const summary = summarizeResults(results);

    const serializedExam = serializeExam(exam);
    delete serializedExam.results;
    delete serializedExam.students;

    res.json({
      exam: serializedExam,
      results,
      summary,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * PATCH /exams/:id
 * Updates an exam owned by the teacher.
 */
export const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    assertValidObjectId(id, 'exam ID');

    const exam = await ExamModel.findOne({
      _id: id,
      teacher: req.teacher._id,
      isActive: true,
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const {
      title,
      description,
      subject,
      examType,
      classId,
      examDate,
      startTime,
      endTime,
      duration,
      venue,
      totalMarks,
      passingMarks,
      instructions,
      status,
    } = req.body || {};

    if (title !== undefined) {
      const cleanTitle = toBoundedText(title, 100);
      if (!cleanTitle) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      exam.title = cleanTitle;
    }

    if (subject !== undefined) {
      const cleanSubject = toBoundedText(subject, 50);
      if (!cleanSubject) {
        return res.status(400).json({ message: 'Subject cannot be empty' });
      }
      exam.subject = cleanSubject;
    }

    if (description !== undefined) {
      exam.description = toBoundedText(description, 500);
    }

    if (examType !== undefined) {
      if (EXAM_TYPES.includes(String(examType).toLowerCase())) {
        exam.examType = String(examType).toLowerCase();
      }
    }

    if (classId && String(classId) !== String(exam.class)) {
      const classItem = await getAssignedClassOrThrow(classId, req.teacher);
      exam.class = classItem._id;
      exam.students = classItem.students || [];
    }

    if (examDate !== undefined) {
      const parsedDate = new Date(examDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid exam date' });
      }
      exam.examDate = parsedDate;
    }

    if (startTime !== undefined) {
      exam.startTime = String(startTime).trim();
    }

    if (endTime !== undefined) {
      exam.endTime = String(endTime).trim();
    }

    if (duration !== undefined) {
      const parsedDuration = Number(duration);
      if (Number.isNaN(parsedDuration) || parsedDuration < 1) {
        return res.status(400).json({ message: 'Duration must be at least 1 minute' });
      }
      exam.duration = parsedDuration;
    }

    if (venue !== undefined) {
      exam.venue = toBoundedText(venue, 100);
    }

    let newTotal = exam.totalMarks;
    if (totalMarks !== undefined) {
      const parsedTotal = Number(totalMarks);
      if (Number.isNaN(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({ message: 'Total marks must be a positive number' });
      }
      newTotal = parsedTotal;
      exam.totalMarks = parsedTotal;
    }

    if (passingMarks !== undefined) {
      const parsedPassing = Number(passingMarks);
      if (Number.isNaN(parsedPassing) || parsedPassing < 0) {
        return res.status(400).json({ message: 'Passing marks must be a positive number' });
      }
      if (parsedPassing > newTotal) {
        return res.status(400).json({ message: 'Passing marks cannot exceed total marks' });
      }
      exam.passingMarks = parsedPassing;
    }

    if (instructions !== undefined) {
      exam.instructions = toBoundedText(instructions, 2000);
    }

    if (status !== undefined) {
      if (EXAM_STATUSES.includes(String(status).toLowerCase())) {
        exam.status = String(status).toLowerCase();
      }
    }

    await exam.save();

    const populated = await ExamModel.findById(exam._id)
      .populate(examPopulate)
      .lean();

    res.json({
      message: 'Exam updated successfully',
      exam: serializeExam(populated),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * PUT /exams/:id/results
 * Saves/updates grading results for students in the exam.
 * Accepts { results: [ { studentId, marksObtained, grade, remarks, isAbsent } ] }.
 */
export const saveExamResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    assertValidObjectId(id, 'exam ID');

    const exam = await ExamModel.findOne({
      _id: id,
      teacher: req.teacher._id,
      isActive: true,
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const rawList = Array.isArray(req.body) ? req.body : req.body?.results;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({
        message: 'Provide at least one result record to save.',
      });
    }

    const classId = exam.class?._id || exam.class;
    const classStudents = await loadClassStudents(classId);
    const allowedStudentIds = new Set(classStudents.map((s) => String(s._id)));

    // Maintain existing results in a map for upserting
    const resultMap = new Map();
    for (const r of exam.results || []) {
      const studentId = String(r.student?._id || r.student || '');
      if (studentId) {
        resultMap.set(studentId, {
          student: r.student?._id || r.student,
          marksObtained: r.marksObtained,
          grade: r.grade || '',
          remarks: r.remarks || '',
          isAbsent: Boolean(r.isAbsent),
        });
      }
    }

    for (const item of rawList) {
      const studentId = String(item?.studentId || item?.student || item?.id || '');

      if (!studentId || !allowedStudentIds.has(studentId)) {
        return res.status(400).json({
          message: `Student ${studentId || 'unknown'} is not enrolled in this exam's class roster.`,
        });
      }

      const isAbsent = Boolean(item.isAbsent);
      let marks = 0;

      if (!isAbsent) {
        marks = Number(item.marksObtained);
        if (item.marksObtained === undefined || Number.isNaN(marks) || marks < 0) {
          return res.status(400).json({
            message: `Marks obtained for student ${studentId} must be a valid number >= 0`,
          });
        }
        if (marks > exam.totalMarks) {
          return res.status(400).json({
            message: `Marks obtained (${marks}) for student ${studentId} cannot exceed total marks (${exam.totalMarks})`,
          });
        }
      }

      const grade = item.grade !== undefined && String(item.grade).trim() !== ''
        ? String(item.grade).trim()
        : isAbsent
          ? 'Absent'
          : calculateGrade(marks, exam.totalMarks);

      const remarks = toBoundedText(item.remarks, 500);

      resultMap.set(studentId, {
        student: new mongoose.Types.ObjectId(studentId),
        marksObtained: isAbsent ? 0 : marks,
        grade,
        remarks,
        isAbsent,
      });
    }

    exam.results = Array.from(resultMap.values());

    // If all students in roster have results, mark as completed
    if (exam.results.length >= classStudents.length && exam.status === 'scheduled') {
      exam.status = 'completed';
    }

    await exam.save();

    const populated = await ExamModel.findById(exam._id)
      .populate(examPopulate)
      .lean();

    const fullRoster = buildResultsRoster(populated, classStudents);
    const summary = summarizeResults(fullRoster);

    res.json({
      message: 'Exam results saved successfully',
      results: fullRoster,
      summary,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

export {
  EXAM_TYPES,
  EXAM_STATUSES,
  calculateGrade,
  getAssignedClassOrThrow,
};
