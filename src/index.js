import { Router } from './router.js';
import * as auth from './handlers/auth.js';
import * as games from './handlers/games.js';
import * as quizzes from './handlers/quizzes.js';
import * as blog from './handlers/blog.js';
import * as materials from './handlers/materials.js';
import * as videos from './handlers/videos.js';
import * as users from './handlers/users.js';
import { getDashboard } from './handlers/dashboard.js';
import * as newsletter from './handlers/newsletter.js';
import * as contact from './handlers/contact.js';
import * as search from './handlers/search.js';
import * as assistant from './handlers/assistant.js';
import * as account from './handlers/account.js';
import * as activity from './handlers/activity.js';
import * as google from './handlers/google.js';
import * as stats from './handlers/stats.js';
import { getSessionUser } from './lib/auth.js';

// ---- Stationery OS ----
import * as stnBusiness from './handlers/stationery/business.js';
import * as stnCustomers from './handlers/stationery/customers.js';
import * as stnServices from './handlers/stationery/services.js';
import * as stnInventory from './handlers/stationery/inventory.js';
import * as stnOrders from './handlers/stationery/orders.js';
import * as stnFinance from './handlers/stationery/finance.js';
import * as stnDashboard from './handlers/stationery/dashboard.js';
import * as stnReports from './handlers/stationery/reports.js';
import * as stnPhotoStudio from './handlers/stationery/photostudio.js';
import * as stnFiles from './handlers/stationery/files.js';
import * as stnOnlineServices from './handlers/stationery/onlineservices.js';
import * as stnMachines from './handlers/stationery/machines.js';
import * as stnAcademy from './handlers/stationery/academy.js';
import * as stnChopaAI from './handlers/stationery/chopaai.js';
import * as stnSecurity from './handlers/stationery/security.js';

const router = new Router();

// ---- Auth ----
router.post('/api/auth/register', auth.register);
router.post('/api/auth/login', auth.login);
router.post('/api/auth/logout', auth.logout);
router.get('/api/auth/me', auth.me);
router.post('/api/newsletter/subscribe', newsletter.subscribe);
router.post('/api/contact', contact.sendMessage);
router.get('/api/contact', contact.listMessages);
router.get('/api/newsletter/subscribers', contact.listSubscribers);
router.get('/api/search', search.search);
router.post('/api/ai-assistant', assistant.ask);
router.get('/api/stats', stats.getPublicStats);
router.put('/api/account/profile', account.updateProfile);
router.get('/api/account/profile', account.getProfile);
router.put('/api/account/password', account.updatePassword);
router.get('/api/avatar/:id', account.getAvatar);
router.post('/api/account/avatar', account.updateAvatar);
router.post('/api/activity/game-score', activity.submitGameScore);
router.get('/api/auth/google/config', google.config);
router.post('/api/auth/google', google.signIn);

// ---- Games ----
router.get('/api/games', games.listGames);
router.post('/api/games', games.createGame);
router.get('/api/games/:id', games.getGame);
router.put('/api/games/:id', games.updateGame);
router.delete('/api/games/:id', games.deleteGame);
router.post('/api/games/:id/score', games.submitGameScore);

// ---- Quizzes ----
router.get('/api/quizzes', quizzes.listQuizzes);
router.post('/api/quizzes', quizzes.createQuiz);
router.get('/api/quizzes/:id', quizzes.getQuiz);
router.put('/api/quizzes/:id', quizzes.updateQuiz);
router.delete('/api/quizzes/:id', quizzes.deleteQuiz);
router.post('/api/quizzes/:id/attempt', quizzes.submitQuizAttempt);

// ---- Blog ----
router.get('/api/blog', blog.listPosts);
router.post('/api/blog', blog.createPost);
router.get('/api/blog/:slug', blog.getPost);
router.put('/api/blog/:slug', blog.updatePost);
router.delete('/api/blog/:slug', blog.deletePost);

// ---- Materials (R2) ----
router.get('/api/materials', materials.listMaterials);
router.post('/api/materials', materials.uploadMaterial);
router.get('/api/materials/:id', materials.getMaterial);
router.delete('/api/materials/:id', materials.deleteMaterial);

// ---- Videos (R2 file upload or external URL; admin-only writes) ----
router.get('/api/videos', videos.listVideos);
router.post('/api/videos', videos.createVideo);
router.get('/api/videos/:id', videos.getVideo);
router.put('/api/videos/:id', videos.updateVideo);
router.delete('/api/videos/:id', videos.deleteVideo);
router.get('/api/videos/:id/stream', videos.streamVideo);

// ---- Users (admin-only: list + change role) ----
router.get('/api/users', users.listUsers);
router.put('/api/users/:id/role', users.updateUserRole);

// ---- Dashboard ----
router.get('/api/dashboard', getDashboard);

// ==================== Stationery OS ====================
// ---- Business & staff ----
router.get('/api/stationery/context', stnBusiness.getContext);
router.put('/api/stationery/business', stnBusiness.updateBusiness);
router.get('/api/stationery/staff', stnBusiness.listStaff);
router.post('/api/stationery/staff', stnBusiness.addStaff);
router.put('/api/stationery/staff/:id', stnBusiness.updateStaffRole);

// ---- Customers ----
router.get('/api/stationery/customers', stnCustomers.listCustomers);
router.post('/api/stationery/customers', stnCustomers.createCustomer);
router.get('/api/stationery/customers/:id', stnCustomers.getCustomer);
router.put('/api/stationery/customers/:id', stnCustomers.updateCustomer);
router.delete('/api/stationery/customers/:id', stnCustomers.deleteCustomer);

// ---- Pricing (services) ----
router.get('/api/stationery/services', stnServices.listServices);
router.post('/api/stationery/services', stnServices.createService);
router.put('/api/stationery/services/:id', stnServices.updateService);
router.delete('/api/stationery/services/:id', stnServices.deleteService);

// ---- Inventory ----
router.get('/api/stationery/inventory', stnInventory.listInventory);
router.post('/api/stationery/inventory', stnInventory.createItem);
router.put('/api/stationery/inventory/:id', stnInventory.updateItem);
router.delete('/api/stationery/inventory/:id', stnInventory.deleteItem);
router.post('/api/stationery/inventory/:id/adjust', stnInventory.adjustStock);
router.get('/api/stationery/inventory/:id/history', stnInventory.stockHistory);

// ---- Universal Order Engine ----
router.get('/api/stationery/orders', stnOrders.listOrders);
router.post('/api/stationery/orders', stnOrders.createOrder);
router.get('/api/stationery/orders/:id', stnOrders.getOrder);
router.put('/api/stationery/orders/:id/status', stnOrders.updateOrderStatus);
router.post('/api/stationery/orders/:id/payments', stnOrders.addPayment);
router.get('/api/stationery/orders/:id/receipt', stnOrders.getReceipt);

// ---- Finance ----
router.get('/api/stationery/finance/expenses', stnFinance.listExpenses);
router.post('/api/stationery/finance/expenses', stnFinance.createExpense);
router.delete('/api/stationery/finance/expenses/:id', stnFinance.deleteExpense);
router.get('/api/stationery/finance/cashbook', stnFinance.cashbook);
router.get('/api/stationery/finance/debts', stnFinance.debts);
router.get('/api/stationery/finance/summary', stnFinance.summary);

// ---- Dashboard & reports ----
router.get('/api/stationery/dashboard', stnDashboard.getDashboard);
router.get('/api/stationery/reports', stnReports.getReport);

// ---- Photo Studio ----
router.get('/api/stationery/photo-presets', stnPhotoStudio.listPresets);
router.post('/api/stationery/photo-presets', stnPhotoStudio.createPreset);
router.delete('/api/stationery/photo-presets/:id', stnPhotoStudio.deletePreset);

// ---- Document vault (R2) — used by Photo Studio & PDF/Image tools ----
router.post('/api/stationery/files', stnFiles.uploadFile);
router.get('/api/stationery/files/:key', stnFiles.getFile);
router.delete('/api/stationery/files/:key', stnFiles.deleteFile);

// ---- Online Services (guided checklist center) ----
router.get('/api/stationery/online-services/templates', stnOnlineServices.getTemplates);
router.get('/api/stationery/online-services', stnOnlineServices.listRequests);
router.post('/api/stationery/online-services', stnOnlineServices.createRequest);
router.put('/api/stationery/online-services/:id', stnOnlineServices.updateRequest);

// ---- Machine Center ----
router.get('/api/stationery/machines', stnMachines.listMachines);
router.post('/api/stationery/machines', stnMachines.createMachine);
router.delete('/api/stationery/machines/:id', stnMachines.deleteMachine);

// ---- Academy LMS ----
router.get('/api/stationery/courses', stnAcademy.listCourses);
router.get('/api/stationery/courses/:id', stnAcademy.getCourse);
router.post('/api/stationery/courses/:id/progress', stnAcademy.updateProgress);

// ---- ChopaAI ----
router.post('/api/stationery/chopaai', stnChopaAI.ask);

// ---- Notifications, audit, backup ----
router.get('/api/stationery/notifications', stnSecurity.listNotifications);
router.put('/api/stationery/notifications/:id/read', stnSecurity.markRead);
router.put('/api/stationery/notifications/read-all', stnSecurity.markAllRead);
router.get('/api/stationery/audit-log', stnSecurity.listAuditLog);
router.get('/api/stationery/backup/export', stnSecurity.exportBackup);
router.post('/api/stationery/backup/restore', stnSecurity.restoreBackup);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';

    // Each non-admin role has exactly one home dashboard. Admins can see
    // every dashboard (useful for support/oversight); everyone else is
    // confined to their own.
    const protectedPages = {
      '/dashboard.html': ['user', 'admin'],
      '/dashboard': ['user', 'admin'],
      '/admin.html': ['admin'],
      '/admin': ['admin'],
      '/teachers.html': ['teacher', 'admin'],
      '/teachers': ['teacher', 'admin'],
      '/parents.html': ['parent', 'admin'],
      '/parents': ['parent', 'admin'],
      '/profile.html': ['user', 'admin', 'teacher', 'parent'],
      '/profile': ['user', 'admin', 'teacher', 'parent'],
      // Stationery OS is a separate, role-scoped app (Owner/Manager/
      // Operator/Designer/Accountant) layered on top of *any* signed-in
      // smart21brain account — see src/lib/stationery-auth.js.
      '/stationery-app.html': ['user', 'admin', 'teacher', 'parent'],
      '/stationery-app': ['user', 'admin', 'teacher', 'parent'],
    };

    const allowedRoles = protectedPages[normalizedPath];
    if (allowedRoles) {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        return Response.redirect(new URL('/login.html', request.url), 302);
      }
      if (!allowedRoles.includes(user.role)) {
        // Send them to *their own* dashboard, not always /dashboard.html —
        // otherwise a teacher/parent bounced off another role's page would
        // land back on a page they also can't access, looping forever.
        const roleHome = {
          admin: '/admin.html', teacher: '/teachers.html', parent: '/parents.html', user: '/dashboard.html',
        };
        return Response.redirect(new URL(roleHome[user.role] || '/dashboard.html', request.url), 302);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        const response = await router.handle(request, env, ctx);
        if (response) return response;
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Server error', detail: String(err) }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Everything else: serve the static site from the assets binding.
    return env.ASSETS.fetch(request);
  },
};
