import express from "express";
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import admin from "firebase-admin";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Resolve current directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  await readFile(join(__dirname, "../serviceAccountKey.json"), "utf8")
);

// Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "bevgo-client-management-rckxs5.firebasestorage.app"
});
const bucket = admin.storage().bucket();

// Puppeteer instance
let browserPromise = puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
});

router.post("/generatePdf", async (req, res) => {
  try {
    const { htmlContent, invoiceNumber } = req.body;
    if (!htmlContent || !invoiceNumber) {
      return res.status(400).json({ error: "Missing HTML content or invoiceNumber" });
    }

    const browser = await browserPromise;
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await page.close();

    const tempId = uuidv4();
    const pdfFileName = `pdfs/invoice_${invoiceNumber}_${tempId}.pdf`;
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${pdfFileName}`;

    res.json({ status: "processing", pdfUrl: publicUrl });

    const file = bucket.file(pdfFileName);
    await file.save(pdfBuffer, {
      metadata: { contentType: "application/pdf" },
      resumable: false
    });
    await file.makePublic();

  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({
      error: "Failed to generate PDF",
      details: err.message
    });
  }
});

export default router;
