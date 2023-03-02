const puppeteer = require('puppeteer');
const wait = require('./utils/wait');

const page = 380;
const URL = `https://www.amazon.com/s?i=electronics-intl-ship&bbn=16225009011&rh=n%3A16225009011%2Cn%3A281407&page=${page}&qid=1677670851`;

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
  });
  const pages = await browser.pages();
  const page = pages[0];
  await page.goto(URL, { waitUntil: 'load' });

  let next_button_disabled = false;
  do {
    const next_button = await page.$('.s-pagination-next');
    next_button_disabled = await next_button
      .evaluate(el => el.getAttribute('class'))
      .then(buttonClass => buttonClass
        .includes('s-pagination-disabled'));
    console.log(next_button_disabled);
    if (!next_button_disabled) next_button.click();
    await wait(2000);
  } while (!next_button_disabled);
})();