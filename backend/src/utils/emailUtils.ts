import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
    if (transporter) return transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            pool: true,
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        console.log("No SMTP credentials found in .env, creating ethereal test account for email simulation...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            pool: true,
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
    }

    return transporter;
}

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const mailTransporter = await getTransporter();
        const info = await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"Knot & Bloom" <noreply@knotandbloom.com>',
            to,
            subject,
            text,
            html,
        });

        console.log("Message sent: %s", info.messageId);
        
        // Preview only available when sending through an Ethereal account
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("\n==================================================");
            console.log("📧 EMAIL PREVIEW URL: %s", previewUrl);
            console.log("==================================================\n");
        }
        
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};
