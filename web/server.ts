import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This lets the server read JSON from the browser
app.use(express.json());

// This serves your HTML page from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// This is the main endpoint — the browser sends a question here
app.post('/api/ask', async (req, res) => {
  try {
    const { mode, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    // Dynamically import your existing core agent
    const { runAgent } = await import('../src/agent/coreAgent.js');

    const result = await runAgent({
      mode: mode || 'ask',
      prompt,
      filePath: undefined,
      outputPath: undefined,
      useJson: false,
      showExamples: false,
    });

    res.json({ response: result });
  } catch (error: any) {
    console.error('Agent error:', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
});

// Health check — tells you the server is running
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n✅ STY Agent Web UI is running`);
  console.log(`👉 Open this in your browser: http://localhost:${PORT}\n`);
});
