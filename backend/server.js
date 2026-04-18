const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ Health route (important for Render + demo)
app.get('/', (req, res) => {
  res.send('Curalink backend is running 🚀');
});

// ✅ API route
app.use('/api/research', require('./routes/research'));

// ✅ Dynamic port log (fix)
app.listen(PORT, () => {
<<<<<<< HEAD
  console.log(`Curalink server running on port ${PORT}`);
});
=======
  console.log('Curalink server running on port 5000');
});
>>>>>>> 04e9e96 (final fix: pubmed header + insight improvement)
