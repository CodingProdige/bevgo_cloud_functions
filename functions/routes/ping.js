const {onRequest} = require("firebase-functions/v2/https");

exports.ping = onRequest((req, res) => {
  res.send("pong");
});
