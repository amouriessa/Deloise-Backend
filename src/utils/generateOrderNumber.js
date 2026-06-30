function generateOrderNumber() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${ymd}-${rand}`;
}

module.exports = generateOrderNumber;
