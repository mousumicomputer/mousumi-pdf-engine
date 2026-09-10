const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  // CORS সেটআপ (যাতে আপনার ওয়েবসাইট থেকে কল করা যায়)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { htmlContent, filename } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    // ব্যাকগ্রাউন্ডে গুগল কোলাবের মতো হেডলেস ব্রাউজার চালু করা
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Tiro Bangla ফন্ট ও সিএসএস সম্পূর্ণ লোড হওয়া পর্যন্ত অপেক্ষা করা
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
    });

    // আসল ভেক্টর A4 সাইজ পিডিএফ তৈরি
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await browser.close();

    // ব্রাউজারে সরাসরি ফাইল পাঠিয়ে দেওয়া
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'Statement.pdf'}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Error:', error);
    res.status(500).json({ error: error.message });
  }
};
