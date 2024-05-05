const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 9000;

const app = express();

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    Credentials: true,
    optionSuccessStatus: 200,
}


//middleware
app.use(cors(corsOptions));
app.use(express.json());