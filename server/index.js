const express = require('express');
const path = require('path'); // Add this to handle paths
const app = express();
const cors = require("cors");

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the "uploads" folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/auth", require('./routes/authentication'));
app.use('/profile', require('./routes/profile'));
app.use('/admin', require('./routes/admin')); // Ensure this line is present

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
