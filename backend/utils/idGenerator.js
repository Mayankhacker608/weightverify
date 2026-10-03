const { v4: uuidv4 } = require("uuid");

const generateInstrumentId = () => {
  const year = new Date().getFullYear();
  const count = Math.floor(Math.random() * 900000) + 100000;
  return `LM-INST-${year}-${String(count).padStart(6, "0")}`;
};

const generateApplicationId = () => {
  const year = new Date().getFullYear();
  const count = Math.floor(Math.random() * 900000) + 100000;
  return `APP-${year}-${String(count).padStart(6, "0")}`;
};

const generateCertificateNumber = () => {
  const year = new Date().getFullYear();
  const count = Math.floor(Math.random() * 900000) + 100000;
  return `LM-CERT-${year}-${String(count).padStart(6, "0")}`;
};

const generateQrToken = () => uuidv4();

module.exports = {
  generateInstrumentId,
  generateApplicationId,
  generateCertificateNumber,
  generateQrToken,
};
