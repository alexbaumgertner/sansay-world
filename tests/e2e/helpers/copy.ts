import { ru } from '../../../src/lib/copy/ru'

/**
 * Tests locate by the same copy layer the app renders from (FR-029), so
 * changing a string in one place never silently breaks a locator here — and
 * no test hardcodes a CSS class to find an element.
 */
export const copy = ru
