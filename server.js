const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL database');
  release();
});

// Create jobs table if it doesn't exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  "jobTitle" VARCHAR(255) NOT NULL,
  "companyName" VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  "jobType" VARCHAR(50) NOT NULL,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  description TEXT,
  experience VARCHAR(100),
  "applicationDeadline" DATE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(createTableQuery)
  .then(() => console.log('Jobs table created or already exists'))
  .catch(err => console.error('Error creating table:', err));

// Routes

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single job by ID
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new job
app.post('/api/jobs', async (req, res) => {
  try {
    const {
      jobTitle,
      companyName,
      location,
      jobType,
      minSalary,
      maxSalary,
      description,
      experience,
      applicationDeadline
    } = req.body;

    const result = await pool.query(
      `INSERT INTO jobs 
      ("jobTitle", "companyName", location, "jobType", "salaryMin", "salaryMax", description, experience, "applicationDeadline") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [jobTitle, companyName, location, jobType, minSalary, maxSalary, description, experience, applicationDeadline]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a job
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      jobTitle,
      companyName,
      location,
      jobType,
      minSalary,
      maxSalary,
      description,
      experience,
      applicationDeadline
    } = req.body;

    const result = await pool.query(
      `UPDATE jobs 
      SET "jobTitle" = $1, "companyName" = $2, location = $3, "jobType" = $4, 
          "salaryMin" = $5, "salaryMax" = $6, description = $7, 
          experience = $8, "applicationDeadline" = $9 
      WHERE id = $10 
      RETURNING *`,
      [jobTitle, companyName, location, jobType, minSalary, maxSalary, 
       description, experience, applicationDeadline, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});