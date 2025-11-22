const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: "LifePilot backend running" });
});

app.post('/agent', (req, res) => {
  res.json({ message: "LifePilot agent endpoint placeholder" });
});

app.listen(PORT, () => {
  console.log(`LifePilot backend running on port ${PORT}`);
});

