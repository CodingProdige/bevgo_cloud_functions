import express from "express";
import puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import admin from "firebase-admin";

// Firebase init
import serviceAccount from "../serviceAccountKey.json" assert { type: "json" };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "bevgo-client-management-rckxs5.firebasestorage.app"
});
const bucket = admin.storage().bucket();

const app = express();
app.use(express.json());

// Keep one Puppeteer instance alive
let browserPromise = puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu"
  ]
});

app.post("/generatePdf", async (req, res) => {
  try {
    const { htmlContent, invoiceNumber } = req.body;
    if (!htmlContent || !invoiceNumber) {
      return res.status(400).json({ error: "Missing HTML content or invoiceNumber" });
    }

    // Reuse browser
    const browser = await browserPromise;
    const page = await browser.newPage();

    // Load HTML directly
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await page.close();

    // Generate temp URL (respond immediately)
    const tempId = uuidv4();
    const pdfFileName = `pdfs/invoice_${invoiceNumber}_${tempId}.pdf`;
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${pdfFileName}`;

    res.json({ status: "processing", pdfUrl: publicUrl });

    // Upload to Firebase in background
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

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`PDF generator running on port ${PORT}`);
});
