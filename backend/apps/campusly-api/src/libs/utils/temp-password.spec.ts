import {
  generateParentPassword,
  generateStudentPassword,
} from './temp-password';

const SAMPLES = 1000;
const LOOK_ALIKE = /[0O1lI]/;

describe('temporary passwords', () => {
  it('student: 8 chars with upper, lower, digit and symbol, no look-alike characters', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const password = generateStudentPassword();
      expect(password).toHaveLength(8);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[#@$%&*!?]/);
      expect(password).not.toMatch(LOOK_ALIKE);
    }
  });

  it('parent: readable "Rus6738#" format', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const password = generateParentPassword();
      expect(password).toMatch(/^[A-Z][aeiou][a-z][2-9]{4}[#@$%&*!?]$/);
      expect(password).not.toMatch(LOOK_ALIKE);
    }
  });

  it('is random: 1000 student passwords are all different', () => {
    const passwords = new Set(
      Array.from({ length: SAMPLES }, generateStudentPassword),
    );
    expect(passwords.size).toBe(SAMPLES);
  });
});
