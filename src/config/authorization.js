const groups = ["admin", "student"];

const roles = {
  admin: ["root", "keeper"],
  student: ["reader", "writer"]
};

const authorizations = {
  root: {
    read: ["weekly", "resource", "user"],
    write: ["weekly", "resource", "user"],
    execute: ["weekly", "resource", "user"]
  },
  keeper: {
    read: ["weekly", "resource", "user"],
    write: ["resource"],
    execute: ["resource"]
  },
  reader: {
    read: ["weekly", "resource", "user"],
    write: [],
    execute: []
  },
  writer: {
    read: ["weekly", "resource", "user"],
    write: ["weekly"],
    execute: []
  }
};

export { groups, roles, authorizations };
