import { Schema, model } from 'mongoose';

const qualificationDocSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    document: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const teacherSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
    announcements: [{ type: Schema.Types.ObjectId, ref: 'Announcement' }],
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    qualifications: {
      type: [qualificationDocSchema],
      required: [true, 'At least one qualification document is required'],
      validate: {
        validator: (docs) =>
          Array.isArray(docs) && docs.length >= 1 && docs.length <= 3,
        message: 'Provide between 1 and 3 qualification documents',
      },
    },
    identification: {
      type: { type: String, trim: true, default: '' },
      front: { type: String, trim: true, default: '' },
      back: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true }
);

const Teacher = model('Teacher', teacherSchema);

export default Teacher;