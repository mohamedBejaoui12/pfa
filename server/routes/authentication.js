const router = require('express').Router();
const pool = require('../db');
const jwtGenerator = require('../utils/jwtGenerator');
const authorization = require('../middleware/authorization');
const bcrypt = require('bcrypt'); // Import bcrypt

// User login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if the admin username is provided with an empty password
        if (username === "admin" && password === "") {
            return res.json({ redirectToAdminLogin: true });
        }

        const memberQuery = "SELECT * FROM members WHERE fullname = $1 and member_etat=true";
        const member = await pool.query(memberQuery, [username]);

        if (member.rowCount === 0) {
            return res.status(401).json("Password or username is incorrect");
        }
        
        const user = member.rows[0];
        
        const validPass = await bcrypt.compare(password, user.member_pass);
        if (!validPass) {
            return res.status(401).json("Password or username is incorrect");
        }

        const token = jwtGenerator(username);
        res.json({ token });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});


router.post('/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const memberQuery = "SELECT * FROM members WHERE fullname = $1 and member_etat= true";
        const member = await pool.query(memberQuery, [username]);

        if (member.rowCount === 0) {
            return res.status(401).json("User not found");
        }

        const user = member.rows[0];


        if (!user.admin) {
            return res.status(403).json("Access denied");
        }


        const validPass = await bcrypt.compare(password, user.member_pass);
        if (!validPass) {
            return res.status(401).json("Password or username is incorrect");
        }
        await pool.query(
            "INSERT INTO journal (member_cin, action, action_time) VALUES ($1, $2, NOW())",
            [user.member_cin, 'Admin Loged In']
          );

        // Generate a token
        const token = jwtGenerator(username);
        res.json({ token });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

router.get('/is-verify', authorization, (req, res) => {
    
    if (req.user) {
        res.json(true);
    } else {
        res.json(false);
    }
});

router.get('/get-member-cin', authorization, async (req, res) => {
    try {
      // Assuming req.user is set by the authorization middleware
      const username = req.user.fullname;  // Adjust according to how req.user is set up
      
      const memberQuery = "SELECT member_cin FROM members WHERE fullname = $1";
      const member = await pool.query(memberQuery, [username]);
  
      if (member.rowCount === 0) {
        return res.status(404).json("User not found");
      }
  
      const memberCIN = member.rows[0].member_cin;
      res.json({ member_cin: memberCIN });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server Error");
    }
  });
  

module.exports = router;
