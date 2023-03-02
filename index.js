const puppeteer = require('puppeteer');
const fs = require('fs');
const util = require('util');
const readline = require('readline');
const { exit } = require('process');
const { stringify } = require('querystring');
let pageNumber = 1;
const URL = `https://www.amazon.com/s?k=disk+brakes&page=${pageNumber}`;
const DEBUG_MODE = true;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  useDataDir: './tmp',
});

const writeFileAsync = util.promisify(fs.writeFile);
const wait = (ms) => new Promise(res => setTimeout(res, ms));

function removeAfterSepators(str) {
  const index = str.search(/\(|\|/);
  return index !== -1 ? str.substring(0, index).trim() : str;
}

const ask = str => new Promise(resolve => rl.question(str, resolve));

(async () => {

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
  });
  const pages = await browser.pages();
  const page = pages[0];
  await page.goto(URL);

  //  const productHandles = await page.$$('div.s-main-slot.s-result-list.s-search-results.sg-row > .s-result-item');
  const selector = 'div.s-main-slot.s-result-list.s-search-results.sg-row > div.s-result-item.s-asin'

  const productSelector = 'h2 > a > span';
  const priceSelector = 'span.a-price > span.a-offscreen';
  const imageSelector = 'img.s-image';
  let products = [];

  let next_button_disabled = false;
  do {
    console.log(`Scraping page #${pageNumber}.`);

    // Scrape products
    await page.waitForSelector('[data-cel-widget="search_result_1"]');
    const productHandles = await page.$$(selector);
    for (const handle of productHandles) {
      let title = null;
      let price = null;
      let image = null;
      try {
        title = await handle.$eval(productSelector, el => el.textContent);
        title = removeAfterSepators(title.split(' ').slice(0, 3).join(" "));
      } catch { }

      if (title) {
        try {
          price = await handle.$eval(priceSelector, el => el.textContent);
        } catch { }

        try {
          image = await handle.$eval(imageSelector, el => el.getAttribute('src'));
        } catch { }
        products.push({ title, price, image });
      }
    }

    try {
      await page.waitForSelector('.s-pagination-next', { visible: true });
      const next_button = await page.$('.s-pagination-next');
      next_button_disabled = await next_button
        .evaluate(el => el.getAttribute('class'))
        .then(buttonClass => buttonClass
          .includes('s-pagination-disabled'));
      console.log(`button state on page ${pageNumber} is ${next_button_disabled}`);
      if (!next_button_disabled) {
        pageNumber++;
        await next_button.click();
      }
    } catch (err) {
      next_button_disabled = true;
      console.error(err);
    }
    await wait(1000);
  } while (!next_button_disabled);

  console.log(`Scraped ${products.length} products.`);

  products.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  products = products.filter((element, index, array) => {
    return index > 0 && element.title !== array[index - 1].title;
  })

  try {
    await writeFileAsync('products.json', JSON.stringify(products));
    console.log('Wrote products json object to products.json file');
  } catch (err) {
    console.error(err);
  }

  if (DEBUG_MODE) await ask("Close browser");
  await browser.close();

  exit();
})();