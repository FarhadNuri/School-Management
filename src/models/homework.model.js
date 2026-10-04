import { Schema, model } from 'mongoose';

const homeworkSchema = new Schema(
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
    dueDate: {
      type: Date,
      required: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Instructions cannot exceed 5000 characters'],
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

homeworkSchema.index({ teacher: 1, dueDate: -1 });
homeworkSchema.index({ class: 1, dueDate: -1 });
homeworkSchema.index({ course: 1, dueDate: -1 });

const Homework = model('Homework', homeworkSchema);
export default Homework;