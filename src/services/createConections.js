import puppeteer from "puppeteer";
import promptSync from "prompt-sync";
import dotenv from "dotenv";
dotenv.config();

export class CreateConectionsService {
  recruitersRequested = [];
  page = Number(process.env.PAGE) || 1;

  async handler(req, res) {
    const { browser, page } = await this.setWebPage();

    await this.loginInLinkedin(page);

    await this.captchaVerify(page);

    await page.setViewport({ width: 1480, height: 1700 });

    await this.sendRequests(page);

    await browser.close();

    console.log(`${this.recruitersRequested.length} conexões criadas`);
    return res.json(this.recruitersRequested);
  }

  async setWebPage() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const url = await this.getUrl();
    await page.goto(url);

    await page.setViewport({ width: 1480, height: 700 });
    console.log("Pagina carregada");

    return { page, browser };
  }

  async loginInLinkedin(page) {
    await page.locator(".main__sign-in-link").click();

    await page.locator("#username").fill(process.env.EMAIL);

    await page.locator("#password").fill(process.env.PASSWORD);

    await page.locator(".login__form_action_container button").click();
    console.log("Logado");
  }

  async captchaVerify(page) {
    try {
      console.log("verificando captcha");
      await this.delay5s();
      await this.delay5s();

      const h1Text = await page
        .locator("h1")
        .map((h1) => h1.innerText)
        .wait();

      if (h1Text === "Let's do a quick security check") {
        console.log("captcha");
        await this.delay5s();
        await page.mouse.click(740, 370);
        await this.delay5s();
        await this.delay1s();
        await this.resolveCaptcha(page);
      } else {
        console.log("No Captcha");
      }
    } catch (error) {
      console.log(error.message);
      console.log("No Captcha");
    }
  }

  async resolveCaptcha(page) {
    const prompt = promptSync();

    await page.screenshot({ path: "src/screenshots/captcha.png" });
    const captchaAnswer = prompt("Qual a resposta do captcha?");

    switch (captchaAnswer) {
      case "1":
        await page.mouse.click(640, 250);
        break;
      case "2":
        await page.mouse.click(740, 250);
        break;
      case "3":
        await page.mouse.click(840, 250);
        break;
      case "4":
        await page.mouse.click(640, 370);
        break;
      case "5":
        await page.mouse.click(740, 370);
        break;
      case "6":
        await page.mouse.click(840, 370);
        break;
      default:
        console.log("Não foi possível resolver o captcha");
        break;
    }
    await this.delay1s();
    await page.screenshot({ path: "src/screenshots/captcharesolved.png" });
    await this.delay5s();

    const h1Text = await page
      .locator("h1")
      .map((h1) => h1.innerText)
      .wait();

    if (h1Text === "Let's do a quick security check") {
      await this.resolveCaptcha(page);
    }
  }

  async sendRequests(page) {
    await page.waitForSelector(".entity-result__item");
    await this.delay5s();
    await page.screenshot({ path: "src/screenshots/linkedin.png" });

    const requests = await page.evaluate(async () => {
      const delay1s = () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 1000);
        });
      };

      const requestednames = [];

      const recruiters = document.querySelectorAll(".entity-result__item");

      for (const recruiter of recruiters) {
        const recruiterProfile = recruiter.querySelector(
          ".entity-result__title-text span > span"
        );

        const span = recruiter.querySelector(".artdeco-button__text");
        if (span) {
          if (span.innerText === "Conectar") {
            span.click();
            await delay1s();
            const sendButton = document.querySelector(
              ".artdeco-modal__actionbar .artdeco-button--primary"
            );
            sendButton.click();

            const recruiterName = recruiterProfile.innerText;
            requestednames.push(recruiterName);
          }
        }
      }

      return requestednames;
    });
    await page.screenshot({ path: "src/screenshots/linkedin.png" });
    console.log(`Página ${this.page}: ${requests.length} conexões criadas`);

    this.recruitersRequested = [...this.recruitersRequested, ...requests];

    const target = Number(process.env.CONECTIONS_TARGET);
    if (this.recruitersRequested.length > target) return;

    this.page++;

    const url = await this.getUrl();
    await page.goto(url);

    await this.sendRequests(page);
  }

  async delay5s() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 5000);
    });
  }

  async delay1s() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }

  async getUrl() {
    let baseUrl = 'https://www.linkedin.com/search/results/people/?activelyHiring="true"&';
    const keywordsAndPageQuery = new URLSearchParams({
      keywords: process.env.QUERY,
      page: this.page,
    });

    if (process.env.IS_US_AND_CANADA === "true") {
      baseUrl = baseUrl + 'geoUrn=%5B"101174742"%2C"103644278"%5D&';
    }

    const url = baseUrl + keywordsAndPageQuery;

    return url;
  }
}
