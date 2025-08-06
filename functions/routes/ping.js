const pingHandler = (req, res) => {
  res.send("pong");
};

module.exports = pingHandler;

if (process.env.FUNCTIONS_FRAMEWORK === "firebase") {
  const { onRequest } = require("firebase-functions/v2/https");
  exports.ping = onRequest(pingHandler);
}
