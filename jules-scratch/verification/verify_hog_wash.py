from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console messages and print them
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    import time
    time.sleep(20)
    page.goto("http://localhost:3000")

    # Click the "Newsroom" button
    page.wait_for_selector("#newsroom-btn")
    page.click("#newsroom-btn")

    # Change the grid size
    page.select_option("#grid-size", "2")

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)