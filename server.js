// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Get the API key from environment variables
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_URL = 'https://home-cleaning-schedule-ca19b-default-rtdb.asia-southeast1.firebasedatabase.app';

if (!FIREBASE_API_KEY) {
  console.error('FIREBASE_API_KEY environment variable is not set!');
  process.exit(1);
}

app.use(express.json());
app.use(express.static('public'));

// Endpoint to get schedule data
app.get('/api/schedule', async (req, res) => {
  try {
    const url = `${FIREBASE_URL}/schedule.json?auth=${FIREBASE_API_KEY}&orderBy="Date"`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Firebase request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert Firebase object to sorted array
    const scheduleArray = Object.keys(data || {}).map(key => ({
      id: key,
      ...data[key]
    }));
    
    // Sort by date (assuming DD/MM/YYYY format)
    scheduleArray.sort((a, b) => {
      const [aDay, aMonth, aYear] = a.Date.split('/').map(Number);
      const [bDay, bMonth, bYear] = b.Date.split('/').map(Number);
      
      if (aYear !== bYear) return aYear - bYear;
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    });
    
    res.json(scheduleArray);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule data' });
  }
});

// Endpoint to save new entry
app.post('/api/schedule', async (req, res) => {
  try {
    const newEntry = req.body;
    
    // Validate entry data
    if (!newEntry.Date || !newEntry.Weekday || !newEntry.Name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const url = `${FIREBASE_URL}/schedule.json?auth=${FIREBASE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEntry)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Firebase error: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    res.status(201).json({ success: true, id: result.name });
  } catch (error) {
    console.error('Error saving entry:', error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
