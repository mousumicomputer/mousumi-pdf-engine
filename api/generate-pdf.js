const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ১. নিরাপদ বডি পার্সিং (কখনোই আনডিফাইনড হবে না)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { htmlContent, filename } = body;

    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML content missing' });
    }

    // ২. অফিসিয়াল রিমোট ক্রোমিয়াম প্যাক (এটি দিলে Vercel ক্র্যাশ করার কোনো সুযোগ নেই)
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
    );

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // ফন্ট লোড হওয়া নিশ্চিত করা
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 25000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'Statement.pdf'}"`);
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('SERVER_ERROR_DETAIL:', error);
    return res.status(500).json({ error: error.message || error.toString() });
  }
};
