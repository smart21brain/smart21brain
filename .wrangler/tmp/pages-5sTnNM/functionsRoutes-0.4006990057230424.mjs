import { onRequestPost as __api_games__id__score_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\games\\[id]\\score.js"
import { onRequestPost as __api_quizzes__id__attempt_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\quizzes\\[id]\\attempt.js"
import { onRequestPost as __api_auth_login_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\auth\\login.js"
import { onRequestPost as __api_auth_logout_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\auth\\logout.js"
import { onRequestGet as __api_auth_me_js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\auth\\me.js"
import { onRequestPost as __api_auth_register_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\auth\\register.js"
import { onRequestDelete as __api_blog__slug__js_onRequestDelete } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\blog\\[slug].js"
import { onRequestGet as __api_blog__slug__js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\blog\\[slug].js"
import { onRequestPut as __api_blog__slug__js_onRequestPut } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\blog\\[slug].js"
import { onRequestDelete as __api_games__id__js_onRequestDelete } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\games\\[id].js"
import { onRequestGet as __api_games__id__js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\games\\[id].js"
import { onRequestPut as __api_games__id__js_onRequestPut } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\games\\[id].js"
import { onRequestDelete as __api_materials__id__js_onRequestDelete } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\materials\\[id].js"
import { onRequestGet as __api_materials__id__js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\materials\\[id].js"
import { onRequestDelete as __api_quizzes__id__js_onRequestDelete } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\quizzes\\[id].js"
import { onRequestGet as __api_quizzes__id__js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\quizzes\\[id].js"
import { onRequestPut as __api_quizzes__id__js_onRequestPut } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\quizzes\\[id].js"
import { onRequestGet as __api_blog_index_js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\blog\\index.js"
import { onRequestPost as __api_blog_index_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\blog\\index.js"
import { onRequestGet as __api_dashboard_js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\dashboard.js"
import { onRequestGet as __api_games_index_js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\games\\index.js"
import { onRequestPost as __api_games_index_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\games\\index.js"
import { onRequestGet as __api_materials_index_js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\materials\\index.js"
import { onRequestPost as __api_materials_index_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\materials\\index.js"
import { onRequestGet as __api_quizzes_index_js_onRequestGet } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\quizzes\\index.js"
import { onRequestPost as __api_quizzes_index_js_onRequestPost } from "C:\\Users\\CHOPATECH\\Documents\\GitHub\\smart21brain\\smart21brain\\functions\\api\\quizzes\\index.js"

export const routes = [
    {
      routePath: "/api/games/:id/score",
      mountPath: "/api/games/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_games__id__score_js_onRequestPost],
    },
  {
      routePath: "/api/quizzes/:id/attempt",
      mountPath: "/api/quizzes/:id",
      method: "POST",
      middlewares: [],
      modules: [__api_quizzes__id__attempt_js_onRequestPost],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_js_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_js_onRequestGet],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_js_onRequestPost],
    },
  {
      routePath: "/api/blog/:slug",
      mountPath: "/api/blog",
      method: "DELETE",
      middlewares: [],
      modules: [__api_blog__slug__js_onRequestDelete],
    },
  {
      routePath: "/api/blog/:slug",
      mountPath: "/api/blog",
      method: "GET",
      middlewares: [],
      modules: [__api_blog__slug__js_onRequestGet],
    },
  {
      routePath: "/api/blog/:slug",
      mountPath: "/api/blog",
      method: "PUT",
      middlewares: [],
      modules: [__api_blog__slug__js_onRequestPut],
    },
  {
      routePath: "/api/games/:id",
      mountPath: "/api/games",
      method: "DELETE",
      middlewares: [],
      modules: [__api_games__id__js_onRequestDelete],
    },
  {
      routePath: "/api/games/:id",
      mountPath: "/api/games",
      method: "GET",
      middlewares: [],
      modules: [__api_games__id__js_onRequestGet],
    },
  {
      routePath: "/api/games/:id",
      mountPath: "/api/games",
      method: "PUT",
      middlewares: [],
      modules: [__api_games__id__js_onRequestPut],
    },
  {
      routePath: "/api/materials/:id",
      mountPath: "/api/materials",
      method: "DELETE",
      middlewares: [],
      modules: [__api_materials__id__js_onRequestDelete],
    },
  {
      routePath: "/api/materials/:id",
      mountPath: "/api/materials",
      method: "GET",
      middlewares: [],
      modules: [__api_materials__id__js_onRequestGet],
    },
  {
      routePath: "/api/quizzes/:id",
      mountPath: "/api/quizzes",
      method: "DELETE",
      middlewares: [],
      modules: [__api_quizzes__id__js_onRequestDelete],
    },
  {
      routePath: "/api/quizzes/:id",
      mountPath: "/api/quizzes",
      method: "GET",
      middlewares: [],
      modules: [__api_quizzes__id__js_onRequestGet],
    },
  {
      routePath: "/api/quizzes/:id",
      mountPath: "/api/quizzes",
      method: "PUT",
      middlewares: [],
      modules: [__api_quizzes__id__js_onRequestPut],
    },
  {
      routePath: "/api/blog",
      mountPath: "/api/blog",
      method: "GET",
      middlewares: [],
      modules: [__api_blog_index_js_onRequestGet],
    },
  {
      routePath: "/api/blog",
      mountPath: "/api/blog",
      method: "POST",
      middlewares: [],
      modules: [__api_blog_index_js_onRequestPost],
    },
  {
      routePath: "/api/dashboard",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_dashboard_js_onRequestGet],
    },
  {
      routePath: "/api/games",
      mountPath: "/api/games",
      method: "GET",
      middlewares: [],
      modules: [__api_games_index_js_onRequestGet],
    },
  {
      routePath: "/api/games",
      mountPath: "/api/games",
      method: "POST",
      middlewares: [],
      modules: [__api_games_index_js_onRequestPost],
    },
  {
      routePath: "/api/materials",
      mountPath: "/api/materials",
      method: "GET",
      middlewares: [],
      modules: [__api_materials_index_js_onRequestGet],
    },
  {
      routePath: "/api/materials",
      mountPath: "/api/materials",
      method: "POST",
      middlewares: [],
      modules: [__api_materials_index_js_onRequestPost],
    },
  {
      routePath: "/api/quizzes",
      mountPath: "/api/quizzes",
      method: "GET",
      middlewares: [],
      modules: [__api_quizzes_index_js_onRequestGet],
    },
  {
      routePath: "/api/quizzes",
      mountPath: "/api/quizzes",
      method: "POST",
      middlewares: [],
      modules: [__api_quizzes_index_js_onRequestPost],
    },
  ]