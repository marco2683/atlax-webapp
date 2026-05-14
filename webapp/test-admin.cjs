const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    page.on('dialog', async dialog => {
      console.log('ALERT:', dialog.message());
      await dialog.accept();
    });
    
    await page.goto('http://localhost:5173/admin.html');
    
    // Login
    await page.waitForSelector('.admin-auth-container button', {timeout: 5000}).catch(()=>null);
    const authBtn = await page.$('.admin-auth-container button');
    if(authBtn) {
       await page.type('input[type="email"]', 'admin@atlasdt.com');
       await page.type('input[type="password"]', 'admin123');
       await authBtn.click();
    }
    
    // Wait for CRM to load
    await page.waitForSelector('.admin-nav-item[data-tab="suppliers"]', {timeout: 5000});
    await page.click('.admin-nav-item[data-tab="suppliers"]');
    
    // Click edit on first supplier
    // Try double click on the row or click the edit button
    await page.waitForSelector('tr', {timeout: 5000});
    const editBtn = await page.$('.admin-action-btn[data-action="edit"]');
    if (editBtn) {
       await editBtn.click();
    } else {
       await page.click('tr:nth-child(2)'); // click first row
    }
    
    // Wait for form to open and click save
    await page.waitForSelector('#admin-supplier-form button[type="submit"]', {timeout: 5000});
    await page.click('#admin-supplier-form button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    console.log('Test completed');
  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
})();
