import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper to ensure file exists and return default data if not
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const defaultData = {
        session: {
          gameName: 'Basketball at Rec Center',
          gameDetail: 'Court 3, 5:00 PM (Winner stay 1)',
          teamSize: 5
        },
        teams: [],
        gameHistory: [],
        courtCount: 1
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    throw error;
  }
}

// GET API to fetch all data
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// POST API to update all data
app.post('/api/data', async (req, res) => {
  try {
    const newData = req.body;
    await fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing data:', error);
    res.status(500).json({ error: 'Failed to write data' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening at http://localhost:${PORT}`);
});
