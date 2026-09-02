import { Router } from './router.js';
import * as auth from './handlers/auth.js';
import * as games from './handlers/games.js';
import * as quizzes from './handlers/quizzes.js';
import * as blog from './handlers/blog.js';
import * as materials from './handlers/materials.js';
import { getDashboard } from './handlers/dashboard.js';
import * as newsletter from './handlers/newsletter.js';
import * as contact from './handlers/contact.js';
import * as search from './handlers/search.js';
import * as assistant from './handlers/assistant.js';
import * as account from './handlers/account.js';
import { getSessionUser } from './lib/auth.js';

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
router.put('/api/account/profile', account.updateProfile);
router.get('/api/account/profile', account.getProfile);
router.put('/api/account/password', account.updatePassword);

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

// ---- Dashboard ----
router.get('/api/dashboard', getDashboard);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    const protectedPages = {
      '/dashboard.html': ['user', 'admin', 'teacher', 'parent'],
      '/dashboard': ['user', 'admin', 'teacher', 'parent'],
      '/admin.html': ['admin'],
      '/admin': ['admin'],
      '/teachers.html': ['teacher', 'admin'],
      '/teachers': ['teacher', 'admin'],
      '/parents.html': ['parent', 'admin'],
      '/parents': ['parent', 'admin'],
      '/profile.html': ['user', 'admin', 'teacher', 'parent'],
      '/profile': ['user', 'admin', 'teacher', 'parent'],
    };

    const allowedRoles = protectedPages[normalizedPath];
    if (allowedRoles) {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        return Response.redirect(new URL('/login.html', request.url), 302);
      }
      if (!allowedRoles.includes(user.role)) {
        return Response.redirect(new URL('/dashboard.html', request.url), 302);
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
