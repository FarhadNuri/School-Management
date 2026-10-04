import { Schema, model } from 'mongoose';

const lessonSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Subject cannot exceed 50 characters'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 480 minutes'],
    },
    materials: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length <= 10 &&
            value.every(
              (item) =>
                typeof item === 'string' &&
                item.trim().length > 0 &&
                item.length <= 500
            )
          );
        },
        message: 'Materials must be up to 10 non-empty file URL strings',
      },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    teacherNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Teacher notes cannot exceed 1000 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

lessonSchema.index({ teacher: 1, scheduledAt: -1 });
lessonSchema.index({ class: 1, scheduledAt: -1 });
lessonSchema.index({ course: 1, scheduledAt: -1 });

const Lesson = model('Lesson', lessonSchema);

export default Lesson;
