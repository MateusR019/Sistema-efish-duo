type SendEmailParams = {
  to: string[];
  subject: string;
  text: string;
};

export const sendEmail = async ({ to, subject, text }: SendEmailParams) => {
  // Placeholder: integrate with EmailJS/SMTP/Resend/etc.
  console.info(
    '[email:stub]',
    JSON.stringify({ to, subject, text }, null, 2),
  );
};
