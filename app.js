const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const app = express();
const upload = multer({ dest: 'uploads/' });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '020712',
    database: 'mydatabase'
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

function calculateStandardDeviation(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
}

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
    console.log("Served index.html");
});

app.post('/upload', upload.single('inputFile'), (req, res) => {
    const filePath = path.join(__dirname, req.file.path);
    console.log("File uploaded:", filePath);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('File read error:', err);
            return res.status(500).send('File read error');
        }

        try {
            const lines = data.split('\n');
            const numbers = [];

            lines.forEach(line => {
                const values = line.split(/\s+/).filter(v => v && !isNaN(v)).map(Number);
                numbers.push(...values);
            });

            if (numbers.length === 0) {
                return res.status(400).send('No numeric data found in the file');
            }

            const min = Math.min(...numbers);
            const max = Math.max(...numbers);
            const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
            const stddev = calculateStandardDeviation(numbers);

            connection.query('INSERT INTO stats (min, max, avg) VALUES (?, ?, ?)', [min, max, avg], (error, results) => {
                if (error) {
                    console.error('Database error:', error);
                    return res.status(500).send('Database error');
                }
                res.json({ min, max, avg, stddev });
            });
        } catch (parseError) {
            console.error('Data processing error:', parseError);
            res.status(500).send('Data processing error');
        }
    });
});

app.post('/generate-large-data', async (req, res) => {
    console.log('Generating large data...');
    const batchSize = 100000; 
    const totalSize = 1000000; 
    let largeData = [];
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let i = 0; i < totalSize; i += batchSize) {
        console.log(`Processing batch ${i / batchSize + 1}...`);
        let batch = [];
        for (let j = 0; j < batchSize; j++) {
            const value = Math.floor(Math.random() * 10000);
            batch.push(value);
            if (value < min) min = value;
            if (value > max) max = value;
            sum += value;
        }
        largeData = largeData.concat(batch);
        await new Promise(resolve => setImmediate(resolve)); 
    }

    const avg = sum / largeData.length;
    const stddev = calculateStandardDeviation(largeData);

    console.log('Large data generated.');
    res.json({ min, max, avg, stddev });
});

app.listen(8080, () => {
    console.log('Server started on http://localhost:8080');
});
