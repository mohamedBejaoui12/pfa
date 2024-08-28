// routes/admin.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const pool = require('../db');
const authorization = require('../middleware/authorization');
const bcrypt = require('bcrypt')




// Route to get admin data
router.get('/',authorization, async (req, res) => {
  try {
    const admin = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 and admin = true and member_etat= true", [req.user.fullname]
    );
    if (admin.rowCount === 0) {
      return res.status(404).json("Admin not found");
    }
   

    res.json(admin.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server Error");
  }
});
router.post('/register', async (req, res) => {
  try {
    const { cin, name, etat, grade, admin, validate_from, validate_to, email, password } = req.body;

    // Check if member already exists
    const user = await pool.query("SELECT * FROM members WHERE member_cin = $1", [cin]);
    if (user.rows.length !== 0) {
      return res.status(401).send("User Already Exists");
    }

  

    // Hash password
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // Insert new member
    const newUser = await pool.query(
      "INSERT INTO members (member_cin, fullname, member_etat, grade, admin, created_at, validate_from, validate_to, member_email, member_pass) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9) RETURNING *",
      [cin, name, etat, grade, admin, validate_from, validate_to, email, bcryptPassword]
    );





    // Insert into members_email table
   



    res.json(newUser.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.get('/allmembers', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM members');
    if (users.rowCount === 0) {
      return res.status(404).send("There are no members");
    }
    res.json(users.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.get('/update/:cin', authorization, async (req, res) => {
  try {
    const { cin } = req.params;
    const member = await pool.query('SELECT * FROM members WHERE member_cin = $1', [cin]);
    if (member.rowCount === 0) {
      return res.status(404).json("Member not found");
    }
    res.json(member.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.put('/update/:cin', authorization, async (req, res) => {
  try {
    const { cin } = req.params;
    const { new_cin, fullname, member_etat, grade, admin, validate_from, validate_to, member_email, member_pass } = req.body;
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(member_pass, salt);

    await pool.query(
      `UPDATE members SET member_cin = $1, fullname = $2, member_etat = $3, grade = $4, admin = $5, validate_from = $6, validate_to = $7, member_email = $8, member_pass = $9 WHERE member_cin = $10`,
      [new_cin, fullname, member_etat, grade, admin, validate_from, validate_to, member_email,bcryptPassword , cin]
    );
    const adminH = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 and admin = true", [req.user.fullname]
    );
    if (adminH.rowCount === 0) {
      return res.status(404).json("Admin not found");
    }
    await pool.query(
      "INSERT INTO journal (member_cin, action, action_time) VALUES ($1, $2, NOW())",
      [adminH.rows[0].member_cin, 'Admin Updated a Member']
    );

    res.json("Member updated successfully");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.put('/deactivate-member/:cin', async (req, res) => {
  try {
    const { cin } = req.params;
    await pool.query(
      "UPDATE members SET member_etat = false WHERE member_cin = $1",
      [cin]
    );
    res.json({ message: "Member deactivated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to deactivate member" });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const utf8FileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${Date.now()}-${utf8FileName}`);
  }
});
const upload = multer({ storage: storage });
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: "bejaouihama1253@gmail.com",
    pass: "lgcb rjqk ljku bplm",
  },
});
router.get('/fetch-emails', authorization, async (req, res) => {
  try {
    const emailsResult = await pool.query("SELECT member_email FROM members WHERE member_email IS NOT NULL");
    const emails = emailsResult.rows.map(row => row.member_email);
    res.json({ emails });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
router.post('/addMeeting', authorization, upload.fields([{ name: 'meeting_pdf' }, { name: 'attachments' }]), async (req, res) => {
  try {
    const { title, subject, content, start_at, place, emails } = req.body;
    const selectedEmails = JSON.parse(emails);

    // Verify the admin
    const admin = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 and admin = true", [req.user.fullname]
    );

    if (admin.rowCount === 0) {
      return res.status(403).send("Access denied");
    }

    // Get file paths from the uploaded files
    const meetingPdfPath = req.files['meeting_pdf'] ? req.files['meeting_pdf'][0].path : null;
    const attachmentsPath = req.files['attachments'] ? req.files['attachments'][0].path : null;

    // Insert new meeting
    const newMeeting = await pool.query(
      "INSERT INTO meetings (created_by, title, subject, content, start_at, place, created_at, meeting_pdf, attachments) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8) RETURNING *",
      [req.user.fullname, title, subject, content, start_at, place, meetingPdfPath, attachmentsPath]
    );

    // Log action in journal
    await pool.query(
      "INSERT INTO journal (member_cin, action, action_time) VALUES ($1, $2, NOW())",
      [admin.rows[0].member_cin, 'Add a Meeting']
    );
    console.log(selectedEmails)

    // Send emails to selected recipients
    if (selectedEmails.length > 0) {
      const mailOptions = {
        from: 'bejaouihama1253@gmail.com',
        to: selectedEmails,
        subject: 'إجتماع جديد مجدول',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2 style="color: #2c3e50;">إجتماع جديد مجدول</h2>
            <p>تم جدولة اجتماع جديد.</p>
            <p><strong>العنوان:</strong> ${title}</p>
            <p><strong>الموضوع:</strong> ${subject}</p>
            <p><strong>الوقت:</strong> ${start_at}</p>
            <p><strong>المكان:</strong> ${place}</p>
            <p>نرجو منكم الحضور.</p>
          </div>
        `,
        attachments: [
          meetingPdfPath ? { filename: 'ملف الاجتماع', path: meetingPdfPath } : null,
          attachmentsPath ? { filename: 'المرفقات', path: attachmentsPath } : null
        ].filter(att => att !== null)
      };
    
      await transporter.sendMail(mailOptions);
    }

    if (selectedEmails.length > 0){
      const meetingId = newMeeting.rows[0].meeting_id;
      for (const e of selectedEmails) {
        await pool.query(
          "INSERT INTO members_email (email, added_at, meeting_id) VALUES ($1, NOW(), $2) RETURNING *",
          [e, meetingId]
        );
      }
    }

   

    res.json(newMeeting.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
router.post('/meeting/:id/upload-pv', authorization, upload.single('pv'), async (req, res) => {
  try {
    const { id } = req.params;
    const pvPath = req.file ? req.file.path : null;

    // Fetch the meeting details
    const meeting = await pool.query("SELECT * FROM meetings WHERE meeting_id = $1", [id]);

    if (meeting.rows.length === 0) {
      return res.status(404).send("Meeting not found");
    }

    const meetingData = meeting.rows[0];
    const meetingEndDate = new Date(meetingData.end_at);

    // Ensure the meeting has ended before uploading PV
    if (meetingEndDate > new Date()) {
      return res.status(400).send("Cannot upload PV before the meeting has ended");
    }

    // Update the meeting with the PV path
    await pool.query(
      "UPDATE meetings SET pv_path = $1 WHERE meeting_id = $2",
      [pvPath, id]
    );
    const admin = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 and admin = true", [req.user.fullname]
    );
    if (admin.rowCount === 0) {
      return res.status(404).json("Admin not found");
    }


    await pool.query(
      "INSERT INTO journal (member_cin, action, action_time) VALUES ($1, $2, NOW())",
      [admin.rows[0].member_cin, 'Added a PV']
    );

    // Fetch all member emails
    const members = await pool.query("SELECT member_email FROM members WHERE member_email IS NOT NULL");
    const emailList = members.rows.map(member => member.member_email);

    // Send email notification with PV attached
    if (emailList.length > 0 && pvPath) {
      const mailOptions = {
        from: 'bejaouihama1253@gmail.com',
        to: emailList,
        subject: 'PV Uploaded for Last Meeting',
        html: `
          <h2>PV Uploaded for Last Meeting</h2>
          <p>The PV (rapport or conclusion) for the last meeting has been uploaded.</p>
          <p>Please find the attached PV document.</p>
        `,
        attachments: [
          {
            filename: 'PV.pdf',
            path: pvPath
          }
        ]
      };

      await transporter.sendMail(mailOptions);
    }

    res.json({ message: "PV uploaded successfully and email sent" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.get('/allMeetings', authorization, async (req, res) => {
  try {
    const meetings = await pool.query(
      "SELECT * FROM meetings ORDER BY start_at DESC"
    );
    res.json(meetings.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.get('/meeting/:id', authorization, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the meeting details
    const meeting = await pool.query(
      "SELECT * FROM meetings WHERE meeting_id = $1",
      [id]
    );

    if (meeting.rows.length === 0) {
      return res.status(404).send("Meeting not found");
    }

    const meetingData = meeting.rows[0];
    const meetingPdfExists = meetingData.meeting_pdf && fs.existsSync(path.join(__dirname, '..', 'uploads', path.basename(meetingData.meeting_pdf)));
    const attachmentsExist = meetingData.attachments && fs.existsSync(path.join(__dirname, '..', 'uploads', path.basename(meetingData.attachments)));
    const pvExists = meetingData.pv_path && fs.existsSync(path.join(__dirname, '..', 'uploads', path.basename(meetingData.pv_path)));

    // Fetch the emails associated with this meeting
    const emailsResult = await pool.query(
      "SELECT email FROM members_email WHERE meeting_id = $1",
      [id]
    );

    // Extract emails from the query result
    const emails = emailsResult.rows.map(row => row.email);

    res.json({
      ...meetingData,
      meeting_pdf_exists: meetingPdfExists,
      attachments_exists: attachmentsExist,
      pv_exists: pvExists,
      meeting_pdf_name: meetingPdfExists ? path.basename(meetingData.meeting_pdf) : null,
      attachments_name: attachmentsExist ? path.basename(meetingData.attachments) : null,
      pv_name: pvExists ? path.basename(meetingData.pv_path) : null,
      emails: emails  // Include the emails in the response
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
router.get('/history', authorization, async (req, res) => {
  try {
    const admin = await pool.query(
      "SELECT * FROM members WHERE fullname=$1 AND admin = true",
      [req.user.fullname]
    );

    if (admin.rowCount === 0) {
      return res.status(403).send("Access denied");
    }

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const offset = page * limit;

    const journalEntries = await pool.query(
      "SELECT * FROM journal WHERE member_cin = $1 ORDER BY action_time DESC LIMIT $2 OFFSET $3",
      [admin.rows[0].member_cin, limit, offset]
    );

    res.json({
      entries: journalEntries.rows,
      totalCount: await pool.query("SELECT COUNT(*) FROM journal WHERE member_cin = $1", [admin.rows[0].member_cin])
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});


module.exports = router;


