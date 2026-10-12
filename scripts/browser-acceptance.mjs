#!/usr/bin/env node
/** Actual Chromium browser acceptance of the public, anonymous user experience. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base=process.env.PDE_BROWSER_URL;
if(!base||!/^(http:\/\/127\.0\.0\.1(:[0-9]+)?|https:\/\/[a-z0-9.-]+)\/?$/.test(base))
 throw Error("Set an explicit local or HTTPS test origin in PDE_BROWSER_URL.");
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1365,height:860},locale:"en-US"});
const page=await context.newPage();
const failures=[];
page.on("pageerror",error=>failures.push(error.message));
async function visit(path){
 const response=await page.goto(new URL(path,base).toString(),{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(response?.status(),200,"Expected successful browser navigation at "+path);
 assert.equal(await page.locator("main#main-content").count(),1,"Semantic main region missing at "+path);
 assert.equal(await page.locator('nav[aria-label="Main navigation"]').count(),1,"Navigation landmark missing");
}
try{
 await visit("/");
 assert.match(await page.locator("h1").innerText(),/Less theater\.\s*More answers\./);
 assert.ok(await page.getByRole("link",{name:/Explore the debates/}).count());
 await page.keyboard.press("Tab");
 const focus=await page.evaluate(()=>document.activeElement?.tagName);
 assert.equal(focus,"A","Keyboard navigation must reach a link.");
 await visit("/debates");
 assert.equal(await page.getByRole("searchbox").count(),1);
 assert.equal(await page.locator("form[role=search]").count(),1);
 await page.getByRole("searchbox").fill("budget accountability");
 await page.getByRole("button",{name:/Apply filters/}).click();
 await page.waitForURL(url=>url.searchParams.get("q")==="budget accountability");
 assert.match(await page.locator("h1").innerText(),/Debates in/);
 assert.equal(await page.getByRole("searchbox").inputValue(),"budget accountability");
 await visit("/debates?office=bad%20filter");
 assert.match(await page.locator("h1").innerText(),/Invalid search filters/);
 await visit("/candidates");
 assert.match(await page.locator("h1").innerText(),/Hear the/);
 await visit("/protocol");
 assert.equal(await page.locator(".protocol-step").count(),5);
 assert.match(await page.locator(".protocol-note").innerText(),/Public record/);
 await visit("/sign-in");
 assert.ok(await page.getByLabel("Email address").isVisible());
 assert.ok(await page.getByLabel("Password").isVisible());
 await page.getByRole("button",{name:/New here\? Create an account/}).click();
 assert.ok(await page.getByLabel("Display name").isVisible());
 for(const width of [375,390]){
  await page.setViewportSize({width,height:812});
  for(const path of ["/","/debates","/protocol","/sign-in"]){
   await visit(path);
   const scroll=await page.evaluate(()=>({body:document.body.scrollWidth,html:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   assert.ok(Math.max(scroll.body,scroll.html)<=scroll.viewport+1,
    "Horizontal overflow at "+path+" on "+width+"px viewport: "+JSON.stringify(scroll));
  }
 }
 // Automated WCAG 2.0/2.1/2.2 A and AA checks on the built application.
 // These do not replace manual testing by users of assistive technology.
 const wcagTags=["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22a","wcag22aa"];
 const accessibilityFailures=[];
 for(const width of [1365,375]){
  await page.setViewportSize({width,height:860});
  for(const path of ["/","/debates","/candidates","/protocol","/sign-in"]){
   await visit(path);
   const result=await new AxeBuilder({page}).withTags(wcagTags).analyze();
   for(const violation of result.violations){
    const targets=violation.nodes.map(node=>node.target.join(" ")).slice(0,7).join(", ");
    accessibilityFailures.push(path+" / "+width+"px: "+violation.id+" ["+violation.impact+"] "+targets+" :: "+violation.help);
   }
  }
 }
 assert.deepEqual(accessibilityFailures,[],"Automated WCAG A/AA violations:\n"+accessibilityFailures.join("\n"));
 console.log("PASS: automated WCAG 2.0/2.1/2.2 A/AA rules on five public pages at two viewport widths");
 assert.deepEqual(failures,[],"No uncaught browser runtime exceptions are permitted.");
 console.log("PASS: desktop and mobile Chromium public navigation, archive filters, keyboard focus and account form");
}finally{
 await context.close();await browser.close();
}
