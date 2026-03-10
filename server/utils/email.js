const nodemailer = require('nodemailer');
const db = require('../db');

// Development Email setup using Ethereal
let transporter = null;

async function setupTransporter() {
    if (transporter) return transporter;

    try {
        // Generate a test account if you don't have real credentials
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });

        console.log(`Ethereal Email Setup Active. Messages can be previewed at: https://ethereal.email`);
        return transporter;
    } catch (err) {
        console.error("Failed to setup email transporter", err);
        return null; // fallback
    }
}

async function sendAssignmentEmails() {
    try {
        const mailer = await setupTransporter();
        if (!mailer) return;

        // Fetch all assignments combined with invigilator emails
        const assignmentsQuery = `
            SELECT 
                c.roomName,
                i1.name as inv1_name, i1.email as inv1_email,
                i2.name as inv2_name, i2.email as inv2_email
            FROM room_assignments ra
            JOIN classrooms c ON ra.roomId = c.id
            LEFT JOIN invigilators i1 ON ra.invigilator1Id = i1.id
            LEFT JOIN invigilators i2 ON ra.invigilator2Id = i2.id
        `;

        db.all(assignmentsQuery, [], async (err, rows) => {
            if (err) {
                console.error("Failed to fetch email assignment data:", err);
                return;
            }

            const sendEmailQueue = [];

            rows.forEach(row => {
                if (row.inv1_email) {
                    sendEmailQueue.push({
                        to: row.inv1_email,
                        name: row.inv1_name,
                        room: row.roomName
                    });
                }
                if (row.inv2_email) {
                    sendEmailQueue.push({
                        to: row.inv2_email,
                        name: row.inv2_name,
                        room: row.roomName
                    });
                }
            });

            // Process email dispatch
            for (const notice of sendEmailQueue) {
                try {
                    const info = await mailer.sendMail({
                        from: '"AI Seating System" <admin@aiseating.local>',
                        to: notice.to,
                        subject: "Your Upcoming Exam Invigilation Assignment",
                        text: `Hello ${notice.name},\n\nYou have been automatically assigned to invigilate exams in ${notice.room}.\n\nPlease ensure you are present on time.\n\nThank you,\nAdministration.`,
                        html: `<p>Hello <b>${notice.name}</b>,</p><p>You have been assigned to invigilate exams in <b>${notice.room}</b>.</p><p>Please ensure you are present on time.</p><p>Thank you,<br/>Administration.</p>`
                    });

                    // In real production we wouldn't dump every URL, but for testing this helps the user review it
                    console.log(`Assignment email sent to ${notice.to}. Preview: ${nodemailer.getTestMessageUrl(info)}`);
                } catch (emailErr) {
                    console.error(`Failed to send email to ${notice.to}:`, emailErr);
                }
            }
        });

    } catch (e) {
        console.error("Error in sendAssignmentEmails process:", e);
    }
}

module.exports = { sendAssignmentEmails };
