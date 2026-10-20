import ExamModel from '../../models/exam.model.js';
import {
  assertValidObjectId,
  resolveAccessContext,
  serializeExam,
  examPopulate,
  buildExamVisibilityQuery,
  canAccessExam,
  loadClassStudents,
  buildResultsRoster,
  summarizeResults,
  resolveExamStudentScope,
  filterRosterByScope,
} from '../../utils/examAccess.js';

export const getMyExams = async (req, res, next) => {
  try {
    const context = await resolveAccessContext(req.user);
    const query = buildExamVisibilityQuery(context);

    if (query._id === null) {
      return res.json({ count: 0, exams: [] });
    }

    const exams = await ExamModel.find(query)
      .populate(examPopulate)
      .sort({ examDate: 1, startTime: 1 })
      .lean();

    const serialized = exams.map((exam) => {
      const item = serializeExam(exam);
      delete item.results;
      delete item.students;
      return item;
    });

    res.json({
      count: serialized.length,
      exams: serialized,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    assertValidObjectId(id, 'exam ID');

    const context = await resolveAccessContext(req.user);
    const exam = await ExamModel.findOne({
      _id: id,
      isActive: true,
    })
      .populate(examPopulate)
      .lean();

    if (!exam || !canAccessExam(exam, context)) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const classId = exam.class?._id || exam.class;
    const students = await loadClassStudents(classId);
    const fullRoster = buildResultsRoster(exam, students);
    const scope = await resolveExamStudentScope(req.user, context);
    const results = filterRosterByScope(fullRoster, scope);

    const serializedExam = serializeExam(exam);
    delete serializedExam.results;
    delete serializedExam.students;
    res.json({
      exam: serializedExam,
      results,
      summary: summarizeResults(results),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};