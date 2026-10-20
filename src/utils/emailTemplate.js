const credentialsEmail = ({ firstName, email, password, role, extraText = '' }) => {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    return {
        subject: `Your ${roleLabel} Account Credentials`,

        text: `Hello ${firstName},

Welcome aboard! Your ${role} account has been created.${extraText ? `\n${extraText}\n` : ''}
Email: ${email}
Password: ${password}

For security, please log in and change this password as soon as possible.

- School Web App`,

        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your ${roleLabel} Account Credentials</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Your ${role} account is ready - here are your login credentials.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background-color:#f1f5f9; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1d4ed8; border-radius:16px 16px 0 0;
            padding:36px 40px; text-align:center;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:13px;
              font-weight:bold; letter-spacing:3px; color:#bfdbfe;
              text-transform:uppercase;">
                School Web App
              </div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:26px;
              font-weight:bold; color:#ffffff; margin-top:10px;">
                Welcome aboard, ${firstName}!
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff; padding:40px;">
              <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px;
              line-height:24px; color:#334155; margin:0 0 24px;">
                Your ${role} account has been created by the school administrator.
                Use the credentials below to sign in to your dashboard.
              </p>
              ${extraText
                ? `<p style="font-family:Arial, Helvetica, sans-serif;
              font-size:15px; line-height:24px; color:#334155; margin:0 0 24px;
              ">${extraText}</p>`
                : ''
            }

              <!-- Credentials card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#f8fafc; border:1px solid #e2e8f0;
              border-radius:12px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:11px; font-weight:bold; letter-spacing:1.5px;
                    color:#64748b; text-transform:uppercase; margin-bottom:6px;">
                      Login Email
                    </div>
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:16px; color:#0f172a; margin-bottom:22px;">
                      ${email}
                    </div>

                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:11px; font-weight:bold; letter-spacing:1.5px;
                    color:#64748b; text-transform:uppercase; margin-bottom:8px;">
                      Temporary Password
                    </div>
                    <div style="background-color:#0f172a; border-radius:10px;
                    padding:18px 20px; text-align:center;">
                      <span style="font-family:'Courier New', Courier, monospace;
                      font-size:24px; font-weight:bold; letter-spacing:4px;
                      color:#4ade80; user-select:all; -webkit-user-select:all;">${password}</span>
                    </div>
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:12px; color:#94a3b8; text-align:center; margin-top:10px;">
                      Double-tap or double-click the password to select and copy it
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="margin-top:24px;">
                <tr>
                  <td style="background-color:#fffbeb; border-left:4px solid #f59e0b;
                  border-radius:0 8px 8px 0; padding:14px 18px;">
                    <span style="font-family:Arial, Helvetica, sans-serif;
                    font-size:13px; line-height:20px; color:#92400e;">
                      <strong>Security notice:</strong> this is a temporary password.
                      Please log in and change it as soon as possible.
                    </span>
                  </td>
                </tr>

                <!-- Footer -->
          <tr>
            <td style="background-color:#ffffff; border-top:1px solid #e2e8f0;
            border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px;
              line-height:18px; color:#94a3b8; margin:0;">
                This email was sent automatically because an account was created for
                you.<br />
                If you weren't expecting it, please contact the school administrator.
              </p>
            </td>
          </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>`,
    };
}
const teacherCredentialsEmail = ({ firstName, email, password }) =>
    credentialsEmail({ firstName, email, password, role: 'teacher' });

// Email sent when an admin creates a student. Includes their temporary login password.
const studentCredentialsEmail = ({ firstName, email, password }) =>
    credentialsEmail({ firstName, email, password, role: 'student' });

// Email sent when an admin creates a guardian (or a student with a new guardian).
// Mentions the linked student when known.
const guardianCredentialsEmail = ({ firstName, email, password, studentName }) =>
    credentialsEmail({
        firstName,
        email,
        password,
        role: 'guardian',
        extraText: studentName
            ? `This account is linked to student ${studentName}.`
            : '',
    });
// Email sent to a guardian when an admin issues a new invoice. Includes a pay link.
const invoiceIssuedEmail = ({
    firstName,
    studentName,
    title,
    feeType,
    amountLabel,
    dueDateLabel,
    payUrl,
    dashboardUrl,
}) => {
    const safeName = firstName || 'Guardian';
    const safeStudent = studentName || 'your student';
    const safeTitle = title || 'School invoice';

    return {
        subject: `Invoice: ${safeTitle} for${safeStudent}`,

        text: `Hello ${safeName},

A new invoice has been issued for ${safeStudent}.

${safeTitle}
Fee type: ${feeType || 'Fee'}
Amount: ${amountLabel || ''}
Due: ${dueDateLabel || 'See dashboard'}

Pay online: ${payUrl || dashboardUrl || ''}
View in your dashboard: ${dashboardUrl || ''}

- School Web App`,

        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New Invoice</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background-color:#f1f5f9; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px; width:100%;">
          <tr>
            <td style="background-color:#1d4ed8; border-radius:16px 16px 0 0;
            padding:36px 40px; text-align:center;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:13px;
              font-weight:bold; letter-spacing:3px; color:#bfdbfe;
              text-transform:uppercase;">
                School Web App
              </div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:26px;
              font-weight:bold; color:#ffffff; margin-top:10px;">
                New invoice for ${safeStudent}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; padding:40px;">
              <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px;
              line-height:24px; color:#334155; margin:0 0 24px;">
                Hello ${safeName}, a new invoice has been issued for <strong>${safeStudent}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#f8fafc; border:1px solid #e2e8f0;
              border-radius:12px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:11px; font-weight:bold; letter-spacing:1.5px;
                    color:#64748b; text-transform:uppercase; margin-bottom:6px;
                    ">Invoice</div>
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:18px; font-weight:bold; color:#0f172a; margin-bottom:16px;
                    ">${safeTitle}</div>
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:14px; color:#475569; margin-bottom:8px;">Fee type: ${feeType || 'Fee'}</div>
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:14px; color:#475569; margin-bottom:8px;">Amount: <strong
                    style="color:#0f172a;">${amountLabel || ''}</strong></div>
                    <div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:14px; color:#475569;">Due: ${dueDateLabel || 'See dashboard'}</div>
                  </td>
                </tr>
              </table>
              ${payUrl
                ? `<table role="presentation" width="100%" cellpadding="0"
              cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${payUrl}" style="display:inline-block;
                    background-color:#1d4ed8; color:#ffffff; font-family:Arial,
                    Helvetica, sans-serif; font-size:15px; font-weight:bold;
                    text-decoration:none; padding:14px 28px; border-radius:10px;">
                      Pay invoice
                    </a>
                  </td>
                </tr>
              </table>`
                : ''
            }
              ${dashboardUrl
                ? `<p style="font-family:Arial, Helvetica, sans-serif;
                font-size:13px; line-height:20px; color:#64748b; margin:24px 0 0;
                text-align:center;">
                Or view it in your <a href="${dashboardUrl}" style="color:#1d4ed8;
                ">payments dashboard</a>.
              </p>`
                : ''
            }
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-top:1px solid #e2e8f0;
            border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px;
              line-height:18px; color:#94a3b8; margin:0;">
                This invoice was issued by the school administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
</table>
</body>
</html>`,
    };
}
// HTML/text receipt emailed after a successful payment. Built by
// sendPaymentReceiptEmail.
const paymentReceiptEmail = ({
    firstName,
    studentName,
    title,
    feeType,
    amountLabel,
    paidDateLabel,
    receiptNumber,
    paymentMethod,
    term,
    academicYear,
    receiptPdfUrl,
    dashboardUrl,
}) => {
    const safeName = firstName || 'Guardian';
    const safeStudent = studentName || 'your student';
    const safeTitle = title || 'School fee';
    const safeAmount = amountLabel || '';
    const safeReceipt = receiptNumber || '-';
    const period = [term, academicYear].filter(Boolean).join(' · ');

    // One label/value row in the receipt details table.
    const detailRow = (label, value, isLast = false) => {
        if (!value) return '';
        const border = isLast ? '' : 'border-bottom:1px solid #e2e8f0;';
        return `<tr>
      <td style="padding:12px 0; ${border} font-family:Arial, Helvetica,
      sans-serif; font-size:13px; color:#64748b; width:40%; vertical-align:top;">
        ${label}
      </td>
      <td style="padding:12px 0; ${border} font-family:Arial, Helvetica,
      sans-serif; font-size:13px; color:#0f172a; font-weight:bold;
      text-align:right; vertical-align:top;">
        ${value}
      </td>
    </tr>`;
    };

    return {
        subject: `Receipt: ${safeTitle} - ${safeAmount}`,

        text: `Hello ${safeName},

Your payment was received successfully. Here is your receipt.

Amount paid: ${safeAmount}
Invoice: ${safeTitle}
Student: ${safeStudent}
Fee type: ${feeType || 'Fee'}
${period ? `Period: ${period}\n` : ''}Paid on: ${paidDateLabel || 'Today'}
Method: ${paymentMethod || 'Card'}
Receipt #: ${safeReceipt}

${receiptPdfUrl ? `Download PDF: ${receiptPdfUrl}\n` : ''}${dashboardUrl ? `View in dashboard: ${dashboardUrl}\n` : ''}
- School Web App`,

        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Receipt</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Payment confirmed - ${safeAmount} for ${safeStudent}. Receipt #${safeReceipt}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background-color:#f1f5f9; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a; border-radius:16px 16px 0 0;
            padding:32px 40px; text-align:center;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px;
              font-weight:bold; letter-spacing:3px; color:#94a3b8;
              text-transform:uppercase;">
                School Web App
              </div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:24px;
              font-weight:bold; color:#ffffff; margin-top:10px;">
                Payment receipt
              </div>
              <div style="margin-top:18px;">
                <span style="display:inline-block; background-color:#ecfdf5;
                color:#047857; font-family:Arial, Helvetica, sans-serif;
                font-size:12px; font-weight:bold; letter-spacing:1px;
                text-transform:uppercase; padding:8px 14px; border-radius:999px;">
                  Paid
                </span>
              </div>
            </td>
          </tr>

          <!-- Amount hero -->
          <tr>
            <td style="background-color:#ffffff; padding:36px 40px 8px;
            text-align:center;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px;
              font-weight:bold; letter-spacing:1.5px; color:#64748b;
              text-transform:uppercase; margin-bottom:8px;">
                Amount paid
              </div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:40px;
              font-weight:bold; color:#0f172a; letter-spacing:-0.5px; line-height:1.1;">
                ${safeAmount}
              </div>
              <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px;
              line-height:22px; color:#475569; margin:16px 0 0;">
                Hello ${safeName}, we received your payment for <strong
                style="color:#0f172a;">${safeStudent}</strong>.
              </p>
            </td>
          </tr>

          <!-- Receipt details -->
          <tr>
            <td style="background-color:#ffffff; padding:28px 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#f8fafc; border:1px solid #e2e8f0;
              border-radius:12px;">
                <tr>
                  <td style="padding:8px 28px 4px;">
                    <table role="presentation" width="100%" cellpadding="0"
                    cellspacing="0">
                      ${detailRow('Invoice', safeTitle)}
                      ${detailRow('Student', safeStudent)}
                      ${detailRow('Fee type', feeType || 'Fee')}
                      ${period ? detailRow('Period', period) : ''}
                      ${detailRow('Paid on', paidDateLabel || 'Today')}
                      ${detailRow('Method', paymentMethod || 'Card')}
                      ${detailRow('Receipt #', `<span style="font-family:'Courier New', Courier, monospace; font-size:12px; word-break:break-all;">${safeReceipt}</span>`, true)}
                    </table>
                  </td>
                </tr>
              </table>

              ${receiptPdfUrl || dashboardUrl
                ? `<table role="presentation" width="100%" cellpadding="0"
              cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    ${receiptPdfUrl
                    ? `<a href="${receiptPdfUrl}" style="display:inline-block;
                    background-color:#1d4ed8; color:#ffffff; font-family:Arial,
                    Helvetica, sans-serif; font-size:15px; font-weight:bold;
                    text-decoration:none; padding:14px 28px;
                    border-radius:10px; margin:0 6px 10px;">
                      Download PDF receipt
                    </a>`
                    : ''
                } ${dashboardUrl
                    ? `<div style="font-family:Arial, Helvetica, sans-serif;
                    font-size:13px; line-height:20px; color:#64748b;
                    margin-top:8px;">
                      Or open your <a href="${dashboardUrl}" style="color:#1d4ed8;
                      ">payments dashboard</a>
                    </div>`
                    : ''
                }
                  </td>
                </tr>
              </table>`
                : ''
            }
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-top:1px solid #e2e8f0;
            border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px;
              line-height:18px; color:#94a3b8; margin:0;">
                Keep this email for your records. If anything looks wrong, contact the
                school office.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    };
};

export {
    teacherCredentialsEmail,
    studentCredentialsEmail,
    guardianCredentialsEmail,
    invoiceIssuedEmail,
    paymentReceiptEmail
}