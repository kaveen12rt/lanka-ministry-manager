const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
let databaseReady = false;

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    role: { type: String, default: 'Editor' },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

app.get('/api/health', (req, res) => {
  res.json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
    message: databaseReady ? 'Backend is running' : 'Backend is running, but MongoDB is unavailable',
  });
});

app.get('/api/users', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected. Add this machine IP to MongoDB Atlas Network Access.' });
    }

    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected. Add this machine IP to MongoDB Atlas Network Access.' });
    }

    const { name, password, role } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required.' });
    }

    if (password === process.env.ADMIN_PASSWORD) {
      return res.status(400).json({
        message: 'This password is reserved for the admin account. Please choose another password.',
      });
    }

    const existingUser = await User.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existingUser) {
      return res.status(400).json({ message: 'This user already exists.' });
    }

    const newUser = new User({
      name: name.trim(),
      password: password.trim(),
      role: role || 'Editor',
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  if (!process.env.MONGO_URI) {
    console.error('MongoDB connection skipped: MONGO_URI is missing from environment variables.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    databaseReady = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
};

startServer();
