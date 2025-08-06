import express from "express";
import dotenv from "dotenv";
import generatePdfRouter from "./routes/generatePdf.js"; // Make sure this path is correct

dotenv.config();

const app = express();
app.use(express.json());

app.use("/", generatePdfRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`PDF generator running on port ${PORT}`);
});
