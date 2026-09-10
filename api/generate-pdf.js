const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  // ১. ফিক্সড CORS (ওয়াইল্ডকার্ড এরর সমাধান)
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
    const { htmlContent, filename } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ error: 'No HTML provided' });
    }

    // ২. Vercel মেমরি ক্র্যাশ ফিক্স (No-Sandbox মোড)
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // ৩. টাইমআউট ফিক্স (১৫ সেকেন্ড অপেক্ষা)
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 15000,
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
    console.error('CRASH_REASON:', error);
    return res.status(500).json({ error: error.message });
  }
};
