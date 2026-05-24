import { existsSync } from 'node:fs';
if (!existsSync('public/index.html')) {
  throw new Error('public/index.html is missing');
}
console.log('Design-only static build ready. No bundling required. Humanity survives another deploy.');
