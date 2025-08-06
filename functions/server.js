const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const generatePdf = require("./routes/generatePdf");
const ping = require("./routes/ping");

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

// Routes
app.post("/generatePdf", generatePdf);
app.get("/ping", ping);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
