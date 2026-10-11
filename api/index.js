/**
 * Vercel Serverless API Entrypoint
 * Bridges incoming Vercel HTTP serverless invocations to the Express application.
 */

import app from "../backend/src/app.js";

export default function handler(req, res) {
  return app(req, res);
}
