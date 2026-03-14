import { dispatchToApp } from '../_lib/dispatch.js';

export default function handler(req, res) {
  return dispatchToApp(req, res, '/support/contact');
}