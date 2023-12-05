const express = require('express');
const mongoose = require('mongoose');
const cheerio = require('cheerio');
const https = require('https');
const app = express();
const port = 3001;
const url = 'https://powrbot.com/companies/list-of-companies-in-united-states/?page=';

// MongoDB connection URL (replace with your MongoDB URL)
const dbUrl = 'mongodb://localhost:27017/mydatabase';

// Define the mongoose model
const PowrBotModel = mongoose.model('powrbot.com', new mongoose.Schema({
  id: Number,
  company_name: String,
  website: String,
  snippet: String,
  industry: String,
  product: String,
}));

// Connect to MongoDB
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    startServer();
    scrapeAndStoreData();
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

app.use(express.json());

async function scrapeAndStoreData() {
  try {
    const offsets = range(1, 1);
    
    for (const offset of offsets) {
      await scrapePageAndStoreData(offset);
    }
  } catch (error) {
    console.error('Error while scraping and storing data:', error);
  }
}

function scrapePageAndStoreData(offset) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      https.get(`${url}${offset}`, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const $ = cheerio.load(data);
          const items = $('ul.list-unstyled > a.d-block');

          items.each(async (index, element) => {
            const link = 'https://powrbot.com' + $(element).attr('href');

            try {
              const companyData = await scrapeCompanyData(link);
              const newData = new PowrBotModel({ id: index + 1, ...companyData });

              await newData.save();
              console.log('Data scraped and stored successfully.');
              resolve();
            } catch (error) {
              console.error('Error scraping and storing data: ', error);
              reject(error);
            }
          });
        });
      });
    }, 100);
  });
}

async function scrapeCompanyData(link) {
  return new Promise((resolve, reject) => {
    https.get(link, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const $ = cheerio.load(data);
        const companyData = {
          company_name: $('th:contains("Company Name")').next().text().trim(),
          website: $('th:contains("Website")').next().find('a').attr('href'),
          snippet: $('th:contains("Snippet")').next().text().trim(),
          industry: $('th:contains("Industry")').next().text().trim(),
          product: $('th:contains("Products")').next().text().trim(),
        };

        resolve(companyData);
      });
    });
  });
}

function range(start, end, step = 1) {
  const result = [];
  for (let i = start; i <= start + end; i += step) {
    result.push(i);
  }
  return result;
}

function startServer() {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}