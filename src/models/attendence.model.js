import {Schema, model} from "mongoose"

const attendanceSchema = new Schema(
  {
    lesson: {type: Schema.Types.ObjectId, ref: 'Lesson', required: true},
    student: {type: Schema.Types.ObjectId, ref: 'Student', required: true},
    class: {type: Schema.Types.ObjectId, ref: 'Class', required: true},
    teacher: {type: Schema.Types.ObjectId, ref: 'Teacher', required: true},
    status: {type: String, enum: ATTENDANCE_STATUSES, required: true},
    note: {type: String, trim: true, default: '', maxlength: [500, 'Note cannot exceed 500 characters']},
    markedBy: {type: Schema.Types.ObjectId, ref: 'Teacher', required: true},
    markedAt: {type: Date, required: true, default: Date.now},
    date: {type: Date, required: true}},
  { timestamps: true }
);

attendanceSchema.index({ lesson: 1, student: 1 }, { unique: true });
attendanceSchema.index({ student: 1, date: -1 });
attendanceSchema.index({ class: 1, date: -1 });
attendanceSchema.index({ teacher: 1, date: -1 });

const Attendance = model('Attendance', attendanceSchema);

export default Attendance;
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
