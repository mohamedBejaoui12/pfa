const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db'); // Ensure you have the correct path to your db module
const authorization = require('../middleware/authorization');
const router = express.Router();
const path = require('path');
const fs = require('fs');



// Route to get profile data
router.get('/', authorization, async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT * FROM members WHERE fullname = $1",
            [req.user.fullname] // Use 'fullname' to match the payload key
        );

        if (user.rowCount === 0) {
            return res.status(404).json("User not found");
        }

        res.json(user.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json("Server Error");
    }
});

// Route to get meetings associated with the logged-in user
router.get('/user-meetings', authorization, async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT * FROM members WHERE fullname = $1",
            [req.user.fullname]
        );

        const userEmail = user.rows[0].member_email; // Assuming email is in the JWT payload
        const meetings = await pool.query(
            `SELECT m.* FROM meetings m
             JOIN members_email me ON m.meeting_id = me.meeting_id
             WHERE me.email = $1`, 
            [userEmail]
        );
  
        res.json(meetings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});
router.get('/user-meetings/:id', authorization, async (req, res) => {
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
  router.get("/search-meetings", authorization, async (req, res) => {
    try {
        const { query } = req.query;

        // Fetch the user's email from the database using the fullname from the token
        const user = await pool.query(
            "SELECT * FROM members WHERE fullname = $1",
            [req.user.fullname]
        );

        // Check if the user was found
        if (user.rowCount === 0) {
            return res.status(404).json("User not found");
        }

        const userEmail = user.rows[0].member_email;

        // Perform the search query using the user's email
        const results = await pool.query(
            `SELECT m.* FROM meetings m
            JOIN members_email me ON m.meeting_id = me.meeting_id
            WHERE (LOWER(m.title) LIKE $1 OR LOWER(m.subject) LIKE $1 OR TO_CHAR(m.start_at, 'YYYY-MM-DD') LIKE $1) 
            AND me.email = $2`,
            [`%${query.toLowerCase()}%`, userEmail]
        );

        res.json(results.rows);
    } catch (err) {
        console.error("Error in search-meetings:", err.message);
        res.status(500).json("Server error");
    }
});

  router.get('/profile-data', authorization, async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT member_cin, fullname, member_email FROM members WHERE fullname = $1",
            [req.user.fullname]
        );
        
        if (user.rowCount === 0) {
            return res.status(404).json("User not found");
        }

        res.json(user.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json("Server Error");
    }
});

// Route to update the user's password
router.put('/update-password', authorization, async (req, res) => {
    try {
        const { newPassword } = req.body;

        // Encrypt the new password
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the password in the database
        await pool.query(
            "UPDATE members SET member_pass = $1 WHERE fullname = $2",
            [hashedPassword, req.user.fullname]
        );

        res.json("Password updated successfully");
    } catch (error) {
        console.error(error.message);
        res.status(500).json("Server Error");
    }
});


module.exports = router;
