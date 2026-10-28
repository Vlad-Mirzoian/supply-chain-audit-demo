'use strict';
const path = require('path');
const express = require('express');
const ejs = require('ejs');
const axios = require('axios');
const logger = require('pino')();
const payments = require('./payments');

const app = express();
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const orders = new Map();

app.post('/orders', async (req, res) => {
  const id = String(orders.size + 1);
  const order = { id, items: req.body.items || [], status: 'new' };
  orders.set(id, order);
  try {
    order.payment = await payments.authorise(order);
    order.status = 'paid';
  } catch (err) {
    logger.error({ err }, 'payment failed');
    order.status = 'payment-failed';
  }
  res.status(201).json(order);
});

app.get('/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).end();
  res.render('order', { order });
});

app.get('/health', async (req, res) => {
  const upstream = await axios.get(process.env.PAYMENT_HEALTH_URL || 'http://localhost:9000/health').then(() => 'ok', () => 'down');
  res.json({ status: 'ok', upstream, renderer: ejs.VERSION });
});

if (require.main === module) {
  app.listen(process.env.PORT || 8080, () => logger.info('acme-orders-api started'));
}
module.exports = app;
