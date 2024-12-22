import isEmail from "isemail";
import { client } from "..";
import { gql } from "graphql-request";

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





interface IValidate {
  (value: string): boolean;
}

export const __ValidateEmail: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  return /^([0-9a-zA-Z_.-\u4e00-\u9fa5])+@([0-9a-zA-Z_.-])+\.([a-zA-Z]{2,8})$/.test(
    value,
  );
};

export const __ValidateStudentEmail: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  if (value.endsWith("@mails.tsinghua.edu.cn")) {
    return __ValidateEmail(value);
  } else {
    return false;
  }
};

export const __ValidateTeacherEmail: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  if (value.endsWith("@tsinghua.edu.cn")) {
    return __ValidateEmail(value);
  } else {
    return false;
  }
}

export const __ValidatePhone: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  return /^[0-9]+$/.test(value) && value.length === 11;
};

export const __ValidateStudentID: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  return /^[0-9]+$/.test(value) && value.length === 10;
};

export const __ValidateClass: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  return /^[\u4e00-\u9fa5]+[0-9]+$/.test(value);
};

export const __ValidateName: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  return /^[\u4e00-\u9fa5]+$/.test(value) || /^[a-zA-Z\s]+$/.test(value);
};

export const __ValidateUsername: IValidate = (value: string) => {
  if (!value) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(value);
};


interface IValidateAsync {
  (value: string): Promise<boolean>;
}
export const __ValidateEmailRegistered: IValidateAsync = async (value: string) => {
  const item: any = await client.request(
    gql`
      query GetUserByEmail($email: String!) {
        users(where: { email: { _eq: $email } }) {
          email
        }
      }
    `,
    { email: value }
  )
  return item?.users?.length !== 0;
};
export const __ValidateStudentIDRegistered: IValidateAsync = async (value: string) => {
  const item: any = await client.request(
    gql`
      query GetUserByStudentId($student_no: String!) {
        users(where: { student_no: { _eq: $student_no } }) {
          student_no
        }
      }
    `,
    { student_no: value }
  )
  return item?.users?.length !== 0;
}
export const __ValidatePhoneRegistered: IValidateAsync = async (value: string) => {
  const item: any = await client.request(
    gql`
      query GetUserByPhone($phone: String!) {
        users(where: { phone: { _eq: $phone } }) {
          phone
        }
      }
    `,
    { phone: value }
  )
  return item?.users?.length !== 0;
}
