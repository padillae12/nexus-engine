const logoData = require('./logoData.json');

const LOGO_BASE64 = logoData.logoBase64 ? `data:image/png;base64,${logoData.logoBase64}` : '';

module.exports = {
  LOGO_BASE64,
};
