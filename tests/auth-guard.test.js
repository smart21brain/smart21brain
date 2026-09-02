const assert = require('node:assert/strict');
const guard = require('../js/auth-guard.js');

assert.equal(typeof guard.isGuestBypassElement, 'function');
assert.equal(guard.isGuestBypassElement({ tagName: 'BUTTON', textContent: 'Continue as Guest' }), true);
assert.equal(guard.isGuestBypassElement({ tagName: 'BUTTON', textContent: 'Sign in with Google' }), false);
assert.equal(guard.shouldAllowGuestFlow({ isLoggedIn: false, isGuestRequest: true }), false);
assert.equal(guard.shouldAllowGuestFlow({ isLoggedIn: true, isGuestRequest: false }), false);

console.log('auth guard regression checks passed');
