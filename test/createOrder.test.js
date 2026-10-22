const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Order } = require('../domain/Order');
const { makeCreateOrder } = require('../createOrder');
const { buildCreateOrder } = require('../index');

function request(items) {
  return { body: JSON.stringify({ items }), user: { id: 7, email: 'buyer@example.com' } };
}

function response() {
  return {
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

test('считает несколько позиций и количество', () => {
  assert.equal(new Order(7, [{ price: 200, qty: 3 }, { price: 50, qty: 2 }]).total, 700);
});

test('скидка включается только выше 10000', () => {
  assert.equal(new Order(7, [{ price: 10000, qty: 1 }]).total, 10000);
  assert.equal(new Order(7, [{ price: 10001, qty: 1 }]).total, 9500.949999999999);
  assert.equal(new Order(7, [{ price: 6000, qty: 2 }]).total, 11400);
});

test('пустой заказ отклоняется до сохранения и уведомления', async () => {
  const unexpected = async () => assert.fail('Внешняя зависимость не должна вызываться');
  const handler = makeCreateOrder({ orderRepository: { save: unexpected }, orderNotifier: { notify: unexpected } });
  const res = response();
  await handler(request([]), res);
  assert.equal(res.code, 400);
  assert.equal(res.body, 'empty');
});

test('сохраняет заказ, затем отправляет письмо и возвращает исходный HTTP-ответ', async () => {
  const calls = [];
  const handler = buildCreateOrder({
    db: { async query(sql, params) { calls.push(['sql', sql, params]); } },
    smtp: { async send(email, message) { calls.push(['mail', email, message]); } },
  });
  const res = response();
  await handler(request([{ price: 6000, qty: 2 }]), res);
  assert.deepEqual(calls, [
    ['sql', 'INSERT INTO orders (user_id, total) VALUES ($1, $2)', [7, 11400]],
    ['mail', 'buyer@example.com', 'Заказ принят'],
  ]);
  assert.equal(res.code, 201);
  assert.equal(res.body, JSON.stringify({ total: 11400 }));
});

test('ошибка сохранения не приводит к отправке письма или успешному ответу', async () => {
  const failure = new Error('storage unavailable');
  const handler = makeCreateOrder({
    orderRepository: { async save() { throw failure; } },
    orderNotifier: { async notify() { assert.fail('Письмо не должно отправляться'); } },
  });
  const res = response();
  await assert.rejects(handler(request([{ price: 100, qty: 1 }]), res), error => error === failure);
  assert.equal(res.code, undefined);
});

test('ошибка почты передаётся вызывающему коду после сохранения заказа', async () => {
  const failure = new Error('mail unavailable');
  let saved = false;
  const handler = makeCreateOrder({
    orderRepository: { async save() { saved = true; } },
    orderNotifier: { async notify() { throw failure; } },
  });
  const res = response();
  await assert.rejects(handler(request([{ price: 100, qty: 1 }]), res), error => error === failure);
  assert.equal(saved, true);
  assert.equal(res.code, undefined);
});
