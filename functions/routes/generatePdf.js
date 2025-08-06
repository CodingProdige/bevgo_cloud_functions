const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

// Firebase Storage bucket
const bucketName = "bevgo-client-management-rckxs5.firebasestorage.app";

// Initialize Firebase Admin SDK if not already
if (!admin.apps.length) {
  if (process.env.IS_LOCAL === "true") {
    console.log("🚀 Running in LOCAL mode - using Service Account");
    const serviceAccount = require("../serviceAccountKey.json"); // Ensure this file exists locally
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });
  } else {
    console.log("🚀 Running in VM/Serverless mode - using Default Credentials");
    admin.initializeApp({
      storageBucket: bucketName,
    });
  }
}

// Core handler function (works for both Express and Firebase)
const generatePdfHandler = async (req, res) => {
  try {
    const { htmlContent, fileName } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ error: "Missing HTML content" });
    }

    const pdfFileName = `${fileName || uuidv4()}.pdf`;
    const localFilePath = path.join("/tmp", pdfFileName);

    let browser;

    // Use Puppeteer's Chromium locally, sparticuz/chromium in production
    if (process.env.IS_LOCAL === "true") {
      console.log("📄 Using Puppeteer's Chromium (local)");
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } else {
      console.log("📄 Using sparticuz/chromium (production)");
      browser = await puppeteer.launch({
        executablePath: await chromium.executablePath(),
        args: chromium.args,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    }

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Save PDF locally (temp path)
    fs.writeFileSync(localFilePath, pdfBuffer);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(`pdfs/${pdfFileName}`);

    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(),
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/pdfs%2F${encodeURIComponent(
      pdfFileName
    )}?alt=media`;

    return res.status(200).json({ pdfUrl: url });
  } catch (error) {
    console.error("❌ Failed to generate PDF:", error);
    return res.status(500).json({
      error: "Failed to generate PDF",
      details: error.message,
    });
  }
};

// Export for Express
module.exports = generatePdfHandler;

// Export for Firebase Functions
if (process.env.FUNCTIONS_FRAMEWORK === "firebase") {
  const { onRequest } = require("firebase-functions/v2/https");
  exports.generatePdf = onRequest(
    {
      memory: "1GiB",
      timeoutSeconds: 300,
    },
    generatePdfHandler
  );
}
