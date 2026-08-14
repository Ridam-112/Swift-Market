import app from "../dist/app.mjs";

export default function handler(req, res) {
  return app(req, res);
}
