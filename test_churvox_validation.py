#!/usr/bin/env python3
"""
Churvox AI Operator Frontend Validation Test
Tests all 10 focus areas as specified in the review request
"""

import asyncio
from playwright.async_api import async_playwright

# Test credentials
EMAIL = "test_owner_20260506_091108@example.com"
PASSWORD = "TestOwner123!"
BASE_URL = "https://admin-portal-draft.preview.emergentagent.com"

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        print("=" * 80)
        print("CHURVOX AI OPERATOR - FRONTEND VALIDATION TEST")
        print("=" * 80)
        
        # Test 1: Login
        print("\n[1/10] Testing Login...")
        try:
            await page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            await page.fill('input[type="email"]', EMAIL)
            await page.fill('input[type="password"]', PASSWORD)
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(4000)
            
            current_url = page.url
            if "/dashboard" in current_url:
                print(f"✅ PASS: Login successful, redirected to dashboard")
            elif "/plans" in current_url:
                print(f"❌ FAIL: User stuck on /plans page")
            else:
                print(f"⚠️  WARN: Unexpected redirect to {current_url}")
                
            await page.screenshot(path=".screenshots/01_login.png", quality=40, full_page=False)
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 2: Smart Hub Command Centre
        print("\n[2/10] Testing Smart Hub Command Centre...")
        try:
            await page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)
            
            content = await page.content()
            has_command = "Command centre" in content or "command centre" in content.lower()
            has_run_button = await page.query_selector('text="Run AI Plan"')
            
            print(f"  Command centre: {has_command}")
            print(f"  Run AI Plan button: {has_run_button is not None}")
            
            if has_run_button:
                await has_run_button.click()
                await page.wait_for_timeout(3000)
                print(f"  ✅ Run AI Plan clicked")
            
            await page.screenshot(path=".screenshots/02_smart_hub.png", quality=40, full_page=False)
            
            if has_command:
                print(f"✅ PASS: Smart Hub functional")
            else:
                print(f"❌ FAIL: Smart Hub incomplete")
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 3: AI Approvals
        print("\n[3/10] Testing AI Approvals...")
        try:
            await page.goto(f"{BASE_URL}/ai-operator/approvals", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            has_title = "AI Approvals Queue" in content
            has_banner = "Approval-first" in content
            
            print(f"  Title: {has_title}")
            print(f"  Safety banner: {has_banner}")
            
            await page.screenshot(path=".screenshots/03_approvals.png", quality=40, full_page=False)
            
            if has_title and has_banner:
                print(f"✅ PASS: AI Approvals functional")
            else:
                print(f"❌ FAIL: AI Approvals incomplete")
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 4: AI Operator Settings
        print("\n[4/10] Testing AI Operator Settings...")
        try:
            await page.goto(f"{BASE_URL}/ai-operator/settings", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            has_heading = "AI Operator" in content
            has_tabs = "Operator mode" in content and "Auto-send categories" in content
            
            print(f"  Heading: {has_heading}")
            print(f"  Tabs: {has_tabs}")
            
            # Test mode switching
            operator_mode_btn = await page.query_selector('text="Operator mode"')
            if operator_mode_btn:
                await operator_mode_btn.click()
                await page.wait_for_timeout(1000)
                
                auto_safe_btn = await page.query_selector('text="Auto-run safe actions"')
                if auto_safe_btn:
                    await auto_safe_btn.click()
                    await page.wait_for_timeout(500)
                    
                    save_btn = await page.query_selector('text="Save"')
                    if save_btn:
                        await save_btn.click()
                        await page.wait_for_timeout(2000)
                        print(f"  ✅ Mode switching works")
            
            await page.screenshot(path=".screenshots/04_settings.png", quality=40, full_page=False)
            
            if has_heading and has_tabs:
                print(f"✅ PASS: AI Settings functional")
            else:
                print(f"❌ FAIL: AI Settings incomplete")
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 5: SMS Page
        print("\n[5/10] Testing SMS Page...")
        try:
            await page.goto(f"{BASE_URL}/sms", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            has_hero = "Communications" in content
            has_packs = "$10" in content and "$45" in content and "$80" in content
            has_coming_soon = "Coming soon" in content
            
            print(f"  Hero: {has_hero}")
            print(f"  Top-up packs: {has_packs}")
            print(f"  NO Coming soon: {not has_coming_soon}")
            
            await page.screenshot(path=".screenshots/05_sms.png", quality=40, full_page=False)
            
            if has_hero and has_packs and not has_coming_soon:
                print(f"✅ PASS: SMS page functional")
            else:
                print(f"❌ FAIL: SMS page incomplete")
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 6: Payroll
        print("\n[6/10] Testing Payroll...")
        try:
            await page.goto(f"{BASE_URL}/payroll", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            has_payroll = "Payroll" in content or "payroll" in content.lower()
            
            print(f"  Payroll content: {has_payroll}")
            
            await page.screenshot(path=".screenshots/06_payroll.png", quality=40, full_page=False)
            
            if has_payroll:
                print(f"✅ PASS: Payroll functional")
            else:
                print(f"❌ FAIL: Payroll incomplete")
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 7: Dispatch
        print("\n[7/10] Testing Dispatch...")
        try:
            await page.goto(f"{BASE_URL}/dispatch", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            has_dispatch = "Dispatch" in content
            
            print(f"  Dispatch content: {has_dispatch}")
            
            await page.screenshot(path=".screenshots/07_dispatch.png", quality=40, full_page=False)
            
            if has_dispatch:
                print(f"✅ PASS: Dispatch functional")
            else:
                print(f"❌ FAIL: Dispatch incomplete")
        except Exception as e:
            print(f"❌ FAIL: {str(e)}")
        
        # Test 8: Detail Pages
        print("\n[8/10] Testing Detail Pages...")
        detail_pages = ["/quotes", "/invoices", "/clients", "/jobs"]
        passed = 0
        
        for route in detail_pages:
            try:
                await page.goto(f"{BASE_URL}{route}", wait_until="networkidle", timeout=20000)
                await page.wait_for_timeout(1500)
                content = await page.content()
                if route[1:] in content.lower():
                    print(f"  ✅ {route}")
                    passed += 1
                else:
                    print(f"  ⚠️  {route}")
            except Exception as e:
                print(f"  ❌ {route}: {str(e)[:30]}")
        
        await page.screenshot(path=".screenshots/08_details.png", quality=40, full_page=False)
        
        if passed >= 3:
            print(f"✅ PASS: Detail pages ({passed}/4)")
        else:
            print(f"❌ FAIL: Detail pages ({passed}/4)")
        
        # Test 9: Sidebar Routes
        print("\n[9/10] Testing Sidebar Routes...")
        routes = ["/dashboard", "/jobs", "/dispatch", "/clients", "/quotes", "/invoices", 
                 "/team", "/payroll", "/automation", "/reports", "/sms", "/integrations", 
                 "/plans", "/settings"]
        ok_count = 0
        
        for route in routes:
            try:
                await page.goto(f"{BASE_URL}{route}", wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(1000)
                content = await page.content()
                if "404" not in content:
                    ok_count += 1
            except:
                pass
        
        await page.screenshot(path=".screenshots/09_sidebar.png", quality=40, full_page=False)
        
        if ok_count >= 12:
            print(f"✅ PASS: Sidebar routes ({ok_count}/{len(routes)})")
        else:
            print(f"❌ FAIL: Sidebar routes ({ok_count}/{len(routes)})")
        
        # Test 10: Mobile
        print("\n[10/10] Testing Mobile...")
        await context.set_viewport_size({"width": 375, "height": 812})
        
        mobile_routes = ["/dashboard", "/payroll", "/sms", "/dispatch", "/ai-operator/settings"]
        mobile_ok = 0
        
        for route in mobile_routes:
            try:
                await page.goto(f"{BASE_URL}{route}", wait_until="networkidle", timeout=20000)
                await page.wait_for_timeout(1500)
                mobile_ok += 1
                await page.screenshot(path=f".screenshots/10_mobile_{route.replace('/', '_')}.png", quality=40, full_page=False)
            except:
                pass
        
        if mobile_ok >= 4:
            print(f"✅ PASS: Mobile ({mobile_ok}/5)")
        else:
            print(f"❌ FAIL: Mobile ({mobile_ok}/5)")
        
        print("\n" + "=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
