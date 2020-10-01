import isEmail from "isemail";

/**
 * Email with `tsinghua` suffix
 */
export const validateEmail = (email: string, tsinghua = false) => {
  if (!isEmail.validate(email)) {
    return false;
  }

  if (tsinghua) {
    return email.endsWith("tsinghua.edu.cn");
  } else {
    return true;
  }
};

/**
 * 8 length minimum password
 * with at least one lowercase, one uppercase, and one number respectively
 */
export const validatePassword = (password: string) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*]{8,}$/.test(
    password
  );
};
