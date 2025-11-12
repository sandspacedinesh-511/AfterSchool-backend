const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://your-connection-string';

// Middleware
// CORS - Allow all origins for development, or specify frontend URL for production
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow all in development, specify in production
  credentials: true
}));
app.use(express.json());

// Logger Middleware - logs all server requests to console
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Static File Middleware - serves images or returns error if not found
app.use('/images', express.static(path.join(__dirname, 'images'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', 'image/jpeg');
  }
}));

// Error handler for static files
app.use('/images', (req, res, next) => {
  res.status(404).json({ error: 'Image not found' });
});

// MongoDB Connection
let db;
let client;

async function connectDB() {
  try {
    // Validate connection string
    if (!MONGODB_URI || MONGODB_URI.includes('your-connection-string')) {
      throw new Error('MongoDB connection string is not set. Please set MONGO_URI or MONGODB_URI environment variable.');
    }

    // Connection options optimized for Render.com and MongoDB Atlas
    // For mongodb+srv://, TLS is automatically handled by the driver
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds for Render deployment
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
      // Additional options for better compatibility
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000
    };

    console.log('Attempting to connect to MongoDB Atlas...');
    console.log('Connection string format:', MONGODB_URI ? 'Set' : 'Missing');
    
    // Create client and connect
    client = new MongoClient(MONGODB_URI, options);
    
    // Test connection with a ping
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    
    db = client.db('afterSchoolClasses');
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Initialize sample data if collections are empty
    await initializeSampleData();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('\n🔍 Troubleshooting steps:');
    console.error('1. ⚠️  IMPORTANT: Check MongoDB Atlas Network Access');
    console.error('   - Go to MongoDB Atlas → Network Access');
    console.error('   - Click "Add IP Address"');
    console.error('   - Add "0.0.0.0/0" to allow all IPs (for testing)');
    console.error('   - OR add Render.com IP ranges (check Render docs)');
    console.error('2. Verify your connection string in Render environment variables');
    console.error('   - Key: MONGO_URI or MONGODB_URI');
    console.error('   - Format: mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority');
    console.error('3. Make sure password special characters are URL-encoded');
    console.error('   - @ becomes %40, # becomes %23, etc.');
    console.error('4. Verify MongoDB Atlas cluster is running (not paused)');
    console.error('5. Check Render logs for more details');
    console.error('6. Ensure Node.js version is 20.x (updated in package.json)\n');
    process.exit(1);
  }
}

// Initialize sample data
async function initializeSampleData() {
  try {
    const lessonsCollection = db.collection('lessons');
    const count = await lessonsCollection.countDocuments();
    
    if (count === 0) {
      const sampleLessons = [
        { subject: 'Mathematics', location: 'London', price: 100, space: 5, icon: 'fa-calculator' },
        { subject: 'English Literature', location: 'Manchester', price: 90, space: 8, icon: 'fa-book' },
        { subject: 'Science', location: 'London', price: 110, space: 3, icon: 'fa-flask' },
        { subject: 'Art & Design', location: 'Birmingham', price: 85, space: 10, icon: 'fa-palette' },
        { subject: 'Music', location: 'London', price: 95, space: 6, icon: 'fa-music' },
        { subject: 'Physical Education', location: 'Leeds', price: 75, space: 12, icon: 'fa-football-ball' },
        { subject: 'Computer Science', location: 'Manchester', price: 120, space: 4, icon: 'fa-laptop-code' },
        { subject: 'History', location: 'Birmingham', price: 80, space: 7, icon: 'fa-landmark' },
        { subject: 'Geography', location: 'London', price: 85, space: 9, icon: 'fa-globe' },
        { subject: 'French Language', location: 'Manchester', price: 95, space: 5, icon: 'fa-language' },
        { subject: 'Drama', location: 'Leeds', price: 88, space: 6, icon: 'fa-theater-masks' },
        { subject: 'Cooking', location: 'London', price: 105, space: 4, icon: 'fa-utensils' }
      ];
      
      await lessonsCollection.insertMany(sampleLessons);
      console.log('Sample lessons data initialized');
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}

// Routes

// GET /lessons - return all lessons
app.get('/lessons', async (req, res) => {
  try {
    const lessonsCollection = db.collection('lessons');
    const lessons = await lessonsCollection.find({}).toArray();
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// GET /search?query=term - search lessons dynamically
app.get('/search', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    const lessonsCollection = db.collection('lessons');
    
    console.log('Search request received. Query:', query);
    
    // If query is empty, return all lessons
    if (!query) {
      console.log('Empty query - returning all lessons');
      const allLessons = await lessonsCollection.find({}).toArray();
      return res.json(allLessons);
    }
    
    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex for partial matching (case-insensitive) for text fields
    const searchRegex = new RegExp(escapedQuery, 'i');
    console.log('Search regex:', searchRegex.toString());
    
    // Convert query to numbers for price and space matching
    const queryNumber = parseFloat(query);
    const queryInt = parseInt(query);
    const isNumericQuery = !isNaN(queryNumber) && query.trim() === queryNumber.toString();
    const isIntQuery = !isNaN(queryInt) && query.trim() === queryInt.toString();
    
    // Build search conditions using $or to search across multiple fields
    const searchConditions = {
      $or: [
        // Match subject (partial, case-insensitive using $regex)
        { subject: { $regex: searchRegex } },
        // Match location (partial, case-insensitive using $regex)
        { location: { $regex: searchRegex } }
      ]
    };
    
    // Add numeric matches if query is a number
    if (isNumericQuery) {
      searchConditions.$or.push({ price: queryNumber });
    }
    if (isIntQuery) {
      searchConditions.$or.push({ space: queryInt });
    }
    
    console.log('Search conditions:', JSON.stringify(searchConditions, null, 2));
    
    // Execute search query
    const lessons = await lessonsCollection.find(searchConditions).toArray();
    
    console.log('Search results:', lessons.length, 'lessons found');
    if (lessons.length > 0) {
      console.log('First result subject:', lessons[0].subject);
    }
    
    res.json(lessons);
  } catch (error) {
    console.error('Error searching lessons:', error);
    res.status(500).json({ error: 'Failed to search lessons' });
  }
});

// PUT /lessons/:id - update lesson availability (space) or any other field
app.put('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lesson ID format' });
    }
    
    // Check if request body is provided
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    
    const lessonsCollection = db.collection('lessons');
    
    // Update any fields provided in the request body
    const updateFields = { ...req.body };
    
    const result = await lessonsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Return success message as requested
    res.json({ message: 'Lesson availability updated successfully' });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// POST /orders - create new order
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, lessons } = req.body;
    
    // Validation
    if (!name || !phone || !lessons || !Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }
    
    // Validate name (letters only)
    if (!/^[A-Za-z\s]+$/.test(name)) {
      return res.status(400).json({ error: 'Name must contain only letters' });
    }
    
    // Validate phone (numbers only)
    if (!/^\d+$/.test(phone)) {
      return res.status(400).json({ error: 'Phone must contain only numbers' });
    }
    
    const ordersCollection = db.collection('orders');
    const lessonsCollection = db.collection('lessons');
    
    // Update lesson spaces and create order
    const orderLessons = [];
    for (const lessonItem of lessons) {
      const lesson = await lessonsCollection.findOne({ _id: new ObjectId(lessonItem.id) });
      if (!lesson) {
        return res.status(404).json({ error: `Lesson ${lessonItem.id} not found` });
      }
      
      if (lesson.space < lessonItem.quantity) {
        return res.status(400).json({ error: `Not enough spaces for ${lesson.subject}` });
      }
      
      // Update lesson space
      await lessonsCollection.updateOne(
        { _id: new ObjectId(lessonItem.id) },
        { $inc: { space: -lessonItem.quantity } }
      );
      
      orderLessons.push({
        id: lessonItem.id,
        subject: lesson.subject,
        quantity: lessonItem.quantity
      });
    }
    
    // Create order
    const order = {
      name,
      phone,
      lessons: orderLessons,
      createdAt: new Date()
    };
    
    const result = await ordersCollection.insertOne(order);
    order._id = result.insertedId;
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

startServer();


