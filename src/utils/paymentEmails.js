import mailer from './Mailer.js';
import {
  invoiceIssuedEmail,
  paymentReceiptEmail,
} from './emailTemplate.js';
import {
  personName,
  paymentPopulate,
  PURPOSE_LABELS,
  METHOD_LABELS,
} from './payment.helpers.js';
import ENV from '../config/env.js';
import PaymentModel from '../models/payment.model.js';

export const formatMoney = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch {
    return `${(currency || 'USD').toUpperCase()} ${Number(amount) || 0}`;
  }
};

export const formatDateLabel = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const ensurePopulated = async (payment) => {
  if (!payment) return null;

  // Already populated with necessary subdocuments
  if (payment.guardian?.user?.email && payment.student?.user?.firstName) {
    return payment;
  }

  // If it's a Mongoose document with populate method
  if (typeof payment.populate === 'function') {
    return payment.populate(paymentPopulate);
  }

  // If it has an ID, reload populated document from DB
  const id = payment._id || payment.id;
  if (id) {
    const loaded = await PaymentModel.findById(id).populate(paymentPopulate);
    if (loaded) return loaded;
  }

  return payment;
};

/**
 * Sends a confirmation payment receipt email to the student's guardian.
 * Called on Stripe webhook events (checkout.session.completed, invoice.paid)
 * and whenever offline or manual payments are confirmed.
 */
export const sendPaymentReceiptEmail = async (paymentInput, options = {}) => {
  try {
    const payment = await ensurePopulated(paymentInput);
    if (!payment) {
      console.warn('sendPaymentReceiptEmail: No payment document found');
      return false;
    }

    const guardianUser = payment.guardian?.user;
    if (!guardianUser?.email) {
      console.warn(
        `sendPaymentReceiptEmail: Guardian email missing for payment ${payment._id || payment.id}`
      );
      return false;
    }

    const studentName = personName(payment.student) || 'your student';
    const dashboardUrl = ENV.FRONTEND_URL
      ? `${ENV.FRONTEND_URL.replace(/\/$/, '')}/dashboard/payments`
      : '';

    const feeType =
      PURPOSE_LABELS[payment.purpose] || payment.purpose || 'School fee';
    const amountLabel = formatMoney(
      payment.amountPaid || payment.amount,
      payment.currency
    );
    const paidDateLabel = formatDateLabel(payment.paidDate || new Date());
    const receiptNumber =
      payment.transactionId ||
      payment.stripePaymentIntentId ||
      payment.stripeInvoiceId ||
      String(payment._id || payment.id || '-');
    const paymentMethod =
      METHOD_LABELS[payment.method] || payment.method || 'Card';
    const receiptPdfUrl =
      payment.receiptUrl || payment.stripeInvoicePdf || '';

    const template = paymentReceiptEmail({
      firstName: guardianUser.firstName,
      studentName,
      title: payment.title,
      feeType,
      amountLabel,
      paidDateLabel,
      receiptNumber,
      paymentMethod,
      term: payment.term || '',
      academicYear: payment.academicYear || '',
      receiptPdfUrl,
      dashboardUrl,
      ...options,
    });

    await mailer.sendEmail({
      to: guardianUser.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (typeof payment.save === 'function') {
      payment.receiptEmailSentAt = new Date();
      await payment.save().catch((err) => {
        console.warn('Could not update receiptEmailSentAt:', err.message);
      });
    }

    return true;
  } catch (error) {
    console.error('sendPaymentReceiptEmail failed:', error.message);
    return false;
  }
};

/**
 * Sends a new invoice notification email to the guardian with payment link.
 * Used when admins issue or resend an invoice.
 */
export const sendInvoiceIssuedEmail = async (paymentInput, options = {}) => {
  try {
    const payment = await ensurePopulated(paymentInput);
    if (!payment) {
      console.warn('sendInvoiceIssuedEmail: No payment document found');
      return false;
    }

    const guardianUser = payment.guardian?.user;
    if (!guardianUser?.email) {
      console.warn(
        `sendInvoiceIssuedEmail: Guardian email missing for payment ${payment._id || payment.id}`
      );
      return false;
    }

    const studentName = personName(payment.student) || 'your student';
    const dashboardUrl = ENV.FRONTEND_URL
      ? `${ENV.FRONTEND_URL.replace(/\/$/, '')}/dashboard/payments`
      : '';
    const payUrl = payment.stripeHostedInvoiceUrl || dashboardUrl;

    const feeType =
      PURPOSE_LABELS[payment.purpose] || payment.purpose || 'Fee';
    const amountLabel = formatMoney(payment.amount, payment.currency);
    const dueDateLabel = formatDateLabel(payment.dueDate);

    const template = invoiceIssuedEmail({
      firstName: guardianUser.firstName,
      studentName,
      title: payment.title,
      feeType,
      amountLabel,
      dueDateLabel,
      payUrl,
      dashboardUrl,
      ...options,
    });

    await mailer.sendEmail({
      to: guardianUser.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return true;
  } catch (error) {
    console.error('sendInvoiceIssuedEmail failed:', error.message);
    return false;
  }
};

export const sendInvoiceEmail = sendInvoiceIssuedEmail;

const paymentEmails = {
  formatMoney,
  formatDateLabel,
  sendPaymentReceiptEmail,
  sendInvoiceIssuedEmail,
  sendInvoiceEmail,
};

export default paymentEmails;
