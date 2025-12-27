const cors = require('cors');

const corsOptions = {
  origin: [
    'https://automerchant.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
