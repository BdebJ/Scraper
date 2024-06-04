import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { setTimeout } from 'node:timers/promises';
import dotenv from 'dotenv';
import fs from 'fs';

import cookieData from './cookies.js';

dotenv.config();
puppeteer.use(StealthPlugin());

const URL = 'https://wellfound.com/';
const EMAIL = process.env.USER_EMAIL;
const PASSWORD = process.env.USER_PASSWORD;

const tzdatetosec = (tzdate) => Math.floor(new Date(tzdate).getTime() / 1000);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
    defaultViewport: null,
    args: ['--start-maximized']
  });
  const page = await browser.newPage();

  page.setCookie(
    { ...cookieData._wellfound, expires: tzdatetosec(cookieData._wellfound.expires) },
    { ...cookieData.datadome, expires: tzdatetosec(cookieData.datadome.expires) },
  );
  page.setDefaultNavigationTimeout(0);

  await page.goto(URL);
  await page.waitForNetworkIdle();
  console.log("In Start Page");
  await page.screenshot({ path: './screenshots/Start.jpg', fullPage: true })

  await page.waitForSelector('a[href="/login"]');
  await setTimeout(2500);

  await Promise.all([
    page.waitForNavigation(),
    page.click('a[href="/login"]')
  ]);
  console.log("In Login Page");
  await page.screenshot({ path: './screenshots/Login_0.jpg', fullPage: true })

  // await page.waitForNetworkIdle();
  await setTimeout(2500);

  await page.waitForSelector('#user_email');
  await page.type('#user_email', EMAIL);
  await page.screenshot({ path: './screenshots/Login_1.jpg', fullPage: true })

  await setTimeout(2500)
  await page.waitForSelector('#user_password');
  await page.type('#user_password', PASSWORD);
  await page.screenshot({ path: './screenshots/Login_2.jpg', fullPage: true })

  await setTimeout(2500)
  await page.waitForSelector('input[type="submit"]');
  await page.screenshot({ path: './screenshots/Login_3.jpg', fullPage: true })

  await Promise.all([
    page.waitForNavigation(),
    page.click('input[type="submit"]')
  ]);
  console.log("Login details sent");

  await page.waitForSelector('.styles_component__uTjje');
  await setTimeout(2500);
  await page.screenshot({ path: './screenshots/User_page.jpg', fullPage: true })

  console.log("Scrolling page 10 times");

  for (let i = 0; i < 20; i++) {
    //await page.waitForNetworkIdle();
    await setTimeout(2500);
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
  }

  const jobData = await page.evaluate(() => {

    const jobCards = Array.from(document.querySelectorAll('.styles_component__uTjje'));

    const data = jobCards.map((jobCard) => ({
      companyName: jobCard.querySelector('.styles_name__zvQcy')?.textContent ?? 'N/A',
      companyTagline: jobCard.querySelector('.styles_subheader__SIX10')?.textContent ?? 'N/A',
      employeeCount: jobCard.querySelector('.styles_companySize__gMajF')?.textContent ?? 'N/A',
      availableJobs: Array.from(jobCard.querySelectorAll('.styles_component__dBicB .styles_component__Ey28k')).map((job) => ({
        jobName: job.querySelector('.styles_info__h20aa .styles_titleBar__f7F5e .styles_title__xpQDw')?.textContent ?? 'N/A',
        link: job.querySelector('.styles_defaultLink__eZMqw.styles_jobLink__US40J')?.getAttribute('href') ?? 'N/A',
        compensation: job.querySelector('.styles_info__h20aa .styles_compensation__3JnvU')?.textContent ?? 'N/A',
        locations: Array.from(job.querySelectorAll('.styles_info__h20aa .styles_location__O9Z62')).map((loc) => loc.textContent),
        posted: job.querySelector('.styles_tags__c_S1s > span:nth-child(2)')?.textContent ?? 'N/A'
      })),
    }));
    return data;
  });

  console.log(jobData);

  fs.writeFile('JobData.json', JSON.stringify(jobData, null, 2), (err) => {
    if (err) {
      console.error('Error writing JobData file:', err);
    } else {
      console.log('JobData File written successfully!');
    }
  });

  console.log("Scraping html");
  const html = await page.content();
  fs.writeFileSync("scrape.html", html);

  await browser.close();
})();
