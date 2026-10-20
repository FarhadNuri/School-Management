import mongoose from 'mongoose';
import { assertValidObjectId, resolveAccessContext, getAccessibleCourses } from './lessonAccess.js';

const homeworkPopulate = [
  {
    path: 'class',
    select: 'className classCode grade academicYear isActive teachers',
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

// True if this teacher is listed on the class. 
// Used when checking whether they may create lessons, homework, or exams for that class.
const isAssignedClass = (classItem, teacherId) => {
  if (!classItem || !teacherId) return false;

  const targetTeacherId = String(teacherId);

  // classItem.teachers might be an array of ObjectIds or populated teacher objects
  return (classItem.teachers || []).some((teacher) => {
    const teacherIdStr = String(teacher._id || teacher);
    return teacherIdStr === targetTeacherId;
  });
};
const buildHomeworkVisibilityQuery = (context) => {
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

const canAccessHomework = (homework, context) => {
  if (!homework || !context) return false;

  if (context.role === 'teacher') {
    return String(homework.teacher) === String(context.teacherId);
  }

  if (context.role === 'student') {
    return context.classIds.includes(String(homework.class));
  }

  if (context.role === 'guardian') {
    return context.classIds.includes(String(homework.class));
  }

  return false;
};

const serializeHomework = (homework) => {
  const plain = typeof homework.toObject === 'function' ? homework.toObject() : { ...homework };

  return {
    id: String(homework._id),
    _id: homework._id,
    title: homework.title || '',
    description: homework.description || '',
    subject: homework.subject || homework.course?.courseName || '',
    dueDate: homework.dueDate || null,
    
    // Class info
    classId: homework.class?._id || null,
    className: homework.class?.className || '',
    classCode: homework.class?.classCode || '',
    
    // Course info (from populate)
    courseId: homework.course?._id || null,
    courseName: homework.course?.courseName || homework.subject || '',
    courseCode: homework.course?.courseCode || '',
    courseType: homework.course?.courseType || '',
    
    // Teacher info (from populate)
    teacherId: homework.teacher?._id || null,
    teacher: getTeacherName(homework),
    
    isActive: homework.isActive ?? true,
    createdAt: homework.createdAt,
    updatedAt: homework.updatedAt,
  };
};

export { homeworkPopulate, assertValidObjectId, buildHomeworkVisibilityQuery, canAccessHomework, serializeHomework,
    getAccessibleCourses, resolveAccessContext, isAssignedClass
 };