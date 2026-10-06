import { Schema, model } from 'mongoose';

const classSchema = new Schema(
    {
        className: { type: String, required: true, trim: true, unique: true, maxlength: [50, 'Class name must be less than 50 characters'] },
        classCode: { type: String, required: true, trim: true, unique: true, uppercase: true, maxlength: [10, 'Class code must be less than 10 characters'] },
        description: { type: String, trim: true, default: '', maxlength: [500, 'Description must be less than 500 characters'] },
        grade: { type: Number, default: null },
        academicYear: { type: String, trim: true, default: '', maxlength: [10, 'Academic year must be less than 10 characters'] },
        students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
        teachers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
        coverImage: { type: String, default: '', maxlength: [200, 'Cover image must be less than 200 characters'] },
        courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        isActive: { type: Boolean, default: true },
        assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
        announcements: [{ type: Schema.Types.ObjectId, ref: 'Announcement' }],
        events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
        resources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],
        notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
        exams: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
        quizzes: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
        complaints: [{ type: Schema.Types.ObjectId, ref: 'Complaint' }],
    },
    { timestamps: true }
);

const Class = model('Class', classSchema);
export default Class