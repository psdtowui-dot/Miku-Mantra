#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Test the Aurelia jewellery eCommerce backend API. Full-stack Next.js + MongoDB app with authentication, admin features, orders, payments (Razorpay MOCK), and reviews."

backend:
  - task: "Public Products API - GET /products"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /products returns 12 seeded products correctly. Category filter (diamond), featured filter, and product detail endpoint with related products all working. Tested successfully."

  - task: "Public Categories, Collections, Banners API"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /categories returns 6 categories, GET /collections returns 4 collections, GET /banners returns 3 active banners. All working correctly."

  - task: "Auth Flow - Register, Login, Logout, Profile"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /auth/register creates user with role='user', sets session cookie. Duplicate email returns 409. POST /auth/login with correct password succeeds, wrong password returns 401. GET /auth/me returns current user. PUT /auth/profile updates name and phone. POST /auth/logout clears session. All working correctly."

  - task: "Admin Auto-Promotion"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /auth/register with email=admin@aurelia.com correctly creates user with role='admin'. Admin auto-promotion working as expected."

  - task: "Addresses CRUD"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /addresses creates address with all fields. GET /addresses lists user's addresses. DELETE /addresses/:id deletes address. All working correctly with proper authentication."

  - task: "Coupons Validation"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /coupons/validate with AURELIA10 returns 10% discount (5000 on 50000 subtotal). WELCOME2000 returns flat 2000 discount. Invalid coupon returns 404. All working correctly."

  - task: "Orders - COD Flow"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /orders with payment='cod' creates order with orderNumber format 'AUR-XXXXXXXX-XXX', status='confirmed'. Stock decrements correctly after order. GET /orders lists user's orders. GET /orders/:id returns order details. All working correctly."

  - task: "Razorpay MOCK Payment"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /payment/razorpay/order returns mock order with id='order_MOCK...', mock=true. POST /payment/razorpay/verify returns verified=true with paymentId. POST /orders with payment='razorpay' creates order with paymentStatus='paid'. All working correctly in MOCK mode."

  - task: "Admin Dashboard"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /admin/dashboard returns stats (totalOrders, totalUsers, totalProducts, totalRevenue) and recentOrders. All fields present and working correctly."

  - task: "Admin Products CRUD"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /admin/products lists all products. POST /admin/products creates new product. PUT /admin/products/:id updates product. DELETE /admin/products/:id deletes product. All CRUD operations working correctly."

  - task: "Admin Orders Management"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /admin/orders lists all orders. PUT /admin/orders/:id updates order status (tested with status='shipped'). All working correctly."

  - task: "Admin Customers, Categories, Collections, Coupons, Banners, Reviews"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /admin/customers lists all users. GET /admin/categories, /collections, /coupons, /banners, /reviews all return correct data. All admin endpoints working correctly."

  - task: "Admin Access Control"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /admin/dashboard with normal user cookie returns 403. GET /admin/dashboard with no cookie returns 403. Admin access control working correctly."

  - task: "Reviews - Create and List"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /reviews creates review with productId, rating, comment. GET /reviews/product/:productId lists reviews for product. All working correctly with proper authentication."

  - task: "Products Pagination (Phase 3)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /products with no params returns {products, total, page, totalPages}. GET /products?page=1&limit=5 returns exactly 5 products with total=12. GET /products?page=2&limit=5 returns next 5 products. Response cache working with 30s TTL - 2nd request faster than 1st. All pagination features working correctly and backwards compatible."

  - task: "Order Status History Tracking (Phase 3)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "POST /orders creates order with statusHistory containing initial 'confirmed' entry with timestamp and note 'Order placed successfully.' PUT /admin/orders/:id with status='packed' adds 2nd entry with different timestamp. Updates to 'shipped' and 'delivered' correctly add entries in chronological order. GET /orders/:id returns full statusHistory with all 4 entries. All status history tracking working correctly."

  - task: "PDF Invoice Generation (Phase 3)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, lib/pdf-invoice.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /orders/:id/invoice returns HTTP 200 with Content-Type: application/pdf. Response body starts with %PDF magic bytes. Content-Disposition header contains filename with order number. PDF size is 2633 bytes (> 1KB). Non-existent order ID correctly returns 404. PDF invoice generation working perfectly."

  - task: "Cache Invalidation (Phase 3)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "Cache invalidation working correctly for all collections. POST /admin/products busts products cache - new product immediately visible in GET /products. Similarly tested and verified cache invalidation for categories, collections, and banners after admin writes. All cache busting working as expected."

  - task: "Sitemap & Robots (Phase 3)"
    implemented: true
    working: true
    file: "app/sitemap.js, app/robots.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "GET /sitemap.xml returns HTTP 200 with Content-Type: application/xml. Contains product URLs (/product/), category URLs (category=), and collection URLs (collection=). GET /robots.txt returns HTTP 200, contains 'Sitemap:' line and '/admin' disallow. Both sitemap and robots working correctly."

  - task: "Regression Tests (Phase 3)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "All existing features verified working after Phase 3 changes. GET /products/celestine-diamond-pendant returns product + related. GET /categories, /collections, /banners all return correct data. POST /coupons/validate with AURELIA10 works correctly. POST /orders with COD placement works and decrements stock correctly. No regressions detected."

  - task: "Courier Tracking After Order Shipped"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, lib/courier.js, lib/notifications.js, lib/email-service.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "PUT /admin/orders/:id accepts carrier, trackingNumber, trackingUrl, courier notes. Automatically builds tracking URL using preset Indian logistics templates (Blue Dart, Delhivery, DTDC, India Post, Shiprocket, FedEx, Ekart). Stores structured courier object in MongoDB and records audit note in statusHistory. Supports updating courier details post-shipment. Sends WhatsApp/SMS & email notifications. Verified via test_courier_tracking.py (6/6 tests passing)."

frontend:
  - task: "Frontend UI"
    implemented: true
    working: "NA"
    file: "app/page.js"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "testing"
          comment: "Frontend testing not performed as per instructions. Only backend API testing was conducted."

  - task: "Courier Tracking UI (Admin & Customer)"
    implemented: true
    working: true
    file: "app/orders/[id]/page.js, app/admin/orders/page.js, components/ui/order-detail-modal.js, app/account/page.js, components/ui/shipping-slip.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "1) Admin orders table shows tracking pill with 1-click track link and opens modal to enter courier details when changing status to shipped. 2) OrderDetailModal includes dedicated Courier & Logistics Tracking panel with inline edit form. 3) Customer order page (/orders/[id]) displays Live Courier Tracking Card with carrier badge, AWB copy button, and Track Package link. 4) Customer account (/account) shows courier tracking badge on order cards. 5) Shipping slip and PDF include carrier name and AWB number. Build verified clean."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "Courier Tracking After Order Shipped"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "testing"
      message: "Completed comprehensive backend API testing. All 78 tests passed with 100% success rate. All backend endpoints are working correctly including: public data APIs, authentication flow, admin auto-promotion, addresses CRUD, coupons validation, orders (COD and Razorpay MOCK), admin endpoints (dashboard, products, orders, customers, categories, collections, coupons, banners, reviews), admin access control, and reviews. No issues found. Backend is production-ready."
    - agent: "testing"
      message: "Phase 3 backend testing completed successfully. All 79 Phase 3 tests passed with 100% success rate. NEW features tested and verified working: (1) Products pagination with backwards compatibility - page/limit params work, cache with 30s TTL confirmed faster on 2nd request. (2) Order status history tracking - statusHistory array correctly tracks all status changes (confirmed→packed→shipped→delivered) with timestamps and notes. (3) PDF Invoice generation - /orders/:id/invoice returns valid PDF with correct headers, magic bytes, and order number in filename. (4) Cache invalidation - admin writes correctly bust cache for products, categories, collections, and banners. (5) Sitemap & Robots - /sitemap.xml contains product/category/collection URLs, /robots.txt has sitemap reference and /admin disallow. (6) Regression tests - all existing features still working correctly, no regressions detected. All Phase 3 features are production-ready."
    - agent: "main"
      message: "Courier Tracking after shipment has been fully implemented and verified. Production build succeeded with zero errors, and all 6 automated courier tracking tests passed (login, ship with Blue Dart, verify AWB and auto-URL generation, statusHistory note audit trail, post-shipment courier update to Delhivery, and customer endpoint verification)."