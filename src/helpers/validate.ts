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
 * 12 length minimum password
 * with at least one lowercase, one uppercase, one special character and one number respectively
 */
export const validatePassword = (password: string) => {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{12,}$/.test(
    password
  );
};
