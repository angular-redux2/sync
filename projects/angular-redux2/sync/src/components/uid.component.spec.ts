/**
 * angular-redux2/sync
 */

import { guid, s4 } from './uid.component';

describe('s4', () => {
    test('generates a string of four hexadecimal characters', () => {
        const result = s4();
        expect(result).toMatch(/^[0-9a-fA-F]{4}$/);
    });
});

describe('guid', () => {
    test('generates a unique identifier string in the correct format', () => {
        const result = guid();
        expect(result).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    });
});
