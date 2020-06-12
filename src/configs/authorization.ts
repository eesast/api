export const roles = [
  "user", // base role; email not verified; cannot log into info
  "student", // email verified; can log into info; can write weekly; can join contests
  "teacher", // manually assigned; email verification not required

  "counselor", // manually assigned; email verification not required; can manage info

  "root",
];
