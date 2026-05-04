import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/ask', async (req, res) => {
  try {
    const { mode, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    const { runCoreAgent } = await import('../src/agent/coreAgent.js');

    const validModes = ['general', 'finance', 'data', 'report'];
    const resolvedMode = validModes.includes(mode) ? mode : 'general';

    const result = await runCoreAgent({
      mode: resolvedMode,
      userInput: prompt,
    });

    res.json({ response: result.summary });
  } catch (error: any) {
    console.error('Agent error:', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n✅ STY Agent Web UI is running`);
  console.log(`👉 Open this in your browser: http://localhost:${PORT}\n`);
});
