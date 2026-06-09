const sql = require('mssql');

const config = {
    user: '',
    password: '',
    server: '',
    port: 1433,
    database: 'guesthouse_management_system',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function connectDB() {
    try {
        await sql.connect(config);
        console.log('Connected to MSSQL');
    } catch (err) {
        console.log('Database connection failed:', err);
    }
}

module.exports = { sql, connectDB };
