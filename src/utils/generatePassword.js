import crypto from 'crypto'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%&*?';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

// Picks one random character from a charset while building a new account password.
function pick(charset) {
  return charset[crypto.randomInt(charset.length)];
}

// Creates a mixed-character password for new teacher, student, and guardian
// accounts. The password is emailed with their login details.
function generatePassword(length = 8) {
  const chars = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SYMBOLS),
    ...Array.from({ length: length - 4 }, () => pick(ALL)),
  ];

  // Shuffle so required characters aren't always in the same positions
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export { generatePassword };
export default generatePassword;