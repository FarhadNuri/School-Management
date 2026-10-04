import { Schema, model } from 'mongoose';

const resultSchema = new Schema({
  student: {type: Schema.Types.ObjectId, ref: 'Student', required: true},
  marksObtained: {type: Number, required: true, min: 0},
  grade: {type: String, trim: true, default: ''},
  remarks: {type: String, trim: true, default: ''},
  isAbsent: {type: Boolean, default: false},
}, {_id: false});


const examSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: [100, 'Title cannot exceed 100 characters'] },
  description: { type: String, trim: true, default: '', maxlength: [500, 'Description cannot exceed 500 characters'] },
  subject: { type: String, required: true, trim: true },
  examType: { type: String, required: true, enum: ['midterm', 'final', 'quiz', 'unit_test', 'other'], default: 'other' },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
  students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  examDate: { type: Date, required: true },
  startTime: { type: String, trim: true, required: true },
  endTime: { type: String, trim: true, required: true },
  duration: { type: Number, required: true, min: 1 },
  venue: { type: String, trim: true, default: '' },
  totalMarks: { type: Number, required: true, min: 0 },
  passingMarks: { type: Number, required: true, min: 0 },
  instructions: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'cancelled'], default: 'scheduled' },
  results: [resultsSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Exam = model('Exam', examSchema);

export default Exam;
