const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 60894;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve specific pages
app.get('/event-preview', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'event-preview.html'));
});

app.get('/obs-dock', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'obs-dock.html'));
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Listening on: 0.0.0.0:${PORT}`);
});
