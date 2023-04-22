/**
 * Generates a random string of four hexadecimal characters.
 * @returns {string} A string containing four hexadecimal characters.
 */

export function s4(): string {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

/**
 * Generates a unique identifier string in the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 * @returns {string} A unique identifier string.
 */

export function guid() {
    return `${ s4() }${ s4() }-${ s4() }-${ s4() }-${ s4() }-${ s4() }${ s4() }${ s4() }`;
}
