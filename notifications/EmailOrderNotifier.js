class EmailOrderNotifier {
  constructor(smtp) {
    this.smtp = smtp;
  }

  async notify(email) {
    await this.smtp.send(email, 'Заказ принят');
  }
}

module.exports = { EmailOrderNotifier };
