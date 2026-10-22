const { makeCreateOrder } = require('./createOrder');
const { SqlOrderRepository } = require('./storage/SqlOrderRepository');
const { EmailOrderNotifier } = require('./notifications/EmailOrderNotifier');

// Здесь соединяются HTTP-обработчик и конкретные внешние зависимости.
function buildCreateOrder({ db, smtp }) {
  return makeCreateOrder({
    orderRepository: new SqlOrderRepository(db),
    orderNotifier: new EmailOrderNotifier(smtp),
  });
}

module.exports = { buildCreateOrder };
