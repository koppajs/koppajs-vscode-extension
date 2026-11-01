import { Core } from '@koppajs/koppajs-core';
import { KoppajsRouter } from '@koppajs/koppajs-router';
import counterPage from './counter-page.kpa';

Core.take(counterPage, 'ecosystem-counter');
Core();

const outlet = globalThis.document.getElementById('app-outlet');
if (!outlet) {
  throw new Error('Ecosystem fixture outlet not found.');
}

const router = new KoppajsRouter({
  outlet,
  basePath: import.meta.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'counter',
      title: 'Ecosystem counter',
      description: 'Published KoppaJS ecosystem compatibility fixture',
      componentTag: 'ecosystem-counter',
    },
  ],
});
router.init();
