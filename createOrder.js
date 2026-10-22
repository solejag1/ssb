const { Order } = require('./domain/Order');

/**
 * @param {object} dependencies
 * @param {{ save(order: Order): Promise<void> }} dependencies.orderRepository
 * @param {{ notify(email: string): Promise<void> }} dependencies.orderNotifier
 */
function makeCreateOrder({ orderRepository, orderNotifier }) {
  return async function createOrder(req, res) {
    const body = JSON.parse(req.body);
    if (!body.items.length) return res.status(400).send('empty');

    const order = new Order(req.user.id, body.items);
    await orderRepository.save(order);
    await orderNotifier.notify(req.user.email);

    return res.status(201).send(JSON.stringify({ total: order.total }));
  };
}

module.exports = { makeCreateOrder };
