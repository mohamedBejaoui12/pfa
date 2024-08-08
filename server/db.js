const { Pool } = require('pg'); // allows us to configure our connection with the db

const pool = new Pool({
    user: 'postgres',
    password: "mb95811235123",
    host: "localhost",
    port: 5432,
    database: "pfa"
});

module.exports = pool; // allows us to manipulate data with this pool variable


// functionality :Configures and exports the PostgreSQL database connection.