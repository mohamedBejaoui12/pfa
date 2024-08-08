const express = require('express');
const app = express();
const cors = require("cors");

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/auth", require('./routes/authentication'));
app.use('/profile', require('./routes/profile'));
app.use('/admin', require('./routes/admin')); // Ensure this line is present

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
