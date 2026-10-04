import { Schema, model } from 'mongoose';

const quizSchema = new Schema(
  {
    quizName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Quiz name must be less than 50 characters'],
    },
    quizDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Quiz description must be less than 500 characters'],
    },
    quizQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    quizAnswers: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
    quizScore: { type: Number, min: 0, max: 100, default: 0 },
    quizStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    quizCoverImage: {
      type: String,
      default: '',
      maxlength: [200, 'Quiz cover image must be less than 200 characters'],
    },
    quizIsActive: { type: Boolean, default: true, default: true },
  },
  { timestamps: true }
);

const Quiz = model('Quiz', quizSchema);

export default Quiz;
