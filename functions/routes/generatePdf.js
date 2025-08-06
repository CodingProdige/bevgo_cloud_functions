const {onRequest} = require("firebase-functions/v2/https");
const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
const admin = require("firebase-admin");
const {v4: uuidv4} = require("uuid");
const fs = require("fs");
const path = require("path");

const bucketName = "bevgo-client-management-rckxs5.firebasestorage.app";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: bucketName,
  });
}

exports.generatePdf = onRequest(
    {
      memory: "1GiB", // Increase the memory to 1 GiB (can be 256MiB, 512MiB, 1GiB, 2GiB, or 4GiB)
      timeoutSeconds: 300, // Increase timeout to 300 seconds (5 minutes)
    },
    async (req, res) => {
      try {
        const {htmlContent, fileName} = req.body;

        if (!htmlContent) {
          res.status(400).json({error: "Missing HTML content"});
          return;
        }

        const pdfFileName = `${fileName || uuidv4()}.pdf`;
        const localFilePath = path.join("/tmp", pdfFileName);

        // Launch Puppeteer with custom Chromium
        const browser = await puppeteer.launch({
          executablePath: await chromium.executablePath(),
          args: chromium.args,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();

        // Set HTML content
        await page.setContent(htmlContent, {waitUntil: "networkidle0"});

        // Generate PDF
        const pdfBuffer = await page.pdf({format: "A4"});
        await browser.close();

        // Save PDF to local file
        fs.writeFileSync(localFilePath, pdfBuffer);

        const bucket = admin.storage().bucket();
        const file = bucket.file(`pdfs/${pdfFileName}`);

        await file.save(pdfBuffer, {
          contentType: "application/pdf",
          metadata: {
            firebaseStorageDownloadTokens: uuidv4(),
          },
        });

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/pdfs%2F${encodeURIComponent(pdfFileName)}?alt=media`;

        res.status(200).json({pdfUrl: url});
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        res.status(500).json({error: "Failed to generate PDF", details: error.message});
      }
    },
);
