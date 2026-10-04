import { Schema, model } from 'mongoose';

const PURPOSES = [
  'tuition',
  'exam_fee',
  'transport',
  'uniform',
  'books',
  'hostel',
  'activity',
  'library',
  'other',
];

const METHODS = [
  'cash',
  'card',
  'bank_transfer',
  'mobile_money',
  'cheque',
  'stripe',
  'other',
];

const STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_paid',
  'cancelled',
];

const paymentSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    guardian: {
      type: Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
      index: true,
    },
    class: { type: Schema.Types.ObjectId, ref: 'Class' },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    purpose: {
      type: String,
      required: true,
      enum: PURPOSES,
      default: 'tuition',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    amount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'USD',
    },
    method: {
      type: String,
      enum: METHODS,
      default: 'stripe',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
      index: true,
    },
    transactionId: { type: String, trim: true, default: '' },
    receiptUrl: { type: String, trim: true, default: '' },
    receiptEmailSentAt: { type: Date, default: null },
    term: { type: String, trim: true, default: '' },
    academicYear: { type: String, trim: true, default: '' },
    dueDate: { type: Date },
    paidDate: { type: Date },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },

    // Stripe
    stripeCustomerId: { type: String, trim: true, default: '' },
    stripeInvoiceId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    stripeHostedInvoiceUrl: { type: String, trim: true, default: '' },
    stripeInvoicePdf: { type: String, trim: true, default: '' },
    stripePaymentIntentId: { type: String, trim: true, default: '' },
    stripeCheckoutSessionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ student: 1, status: 1 });
paymentSchema.index({ guardian: 1, status: 1 });

const Payment = model('Payment', paymentSchema);

export { PURPOSES, METHODS, STATUSES };
export default Payment;
