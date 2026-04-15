const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/research', require('./routes/research'));

app.listen(PORT, () => {
  console.log('Curalink server running on port 5000');
});
