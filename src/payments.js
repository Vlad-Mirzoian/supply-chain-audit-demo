'use strict';
const axios = require('axios');

const client = axios.create({ baseURL: process.env.PAYMENT_URL || 'http://localhost:9000', timeout: 5000 });

async function authorise(order) {
  const { data } = await client.post('/authorise', { order: order.id, amount: order.items.length * 10 });
  return data;
}

module.exports = { authorise };
