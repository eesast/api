import "mocha";
import { expect } from "chai";
import * as request from "supertest";
import Server from "../src/app";
import variables from "./variables";

describe("Users", () => {
  it("should add a new user", () =>
    request(Server)
      .post("/v1/users")
      .send({
        id: 2017000000,
        username: "test",
        password: "pass",
        email: "test@eesast.com",
        name: "test",
        phone: 0,
        department: "string",
        class: "string"
      })
      .expect(201));

  it("should log in", () =>
    request(Server)
      .post("/v1/users/login")
      .send({
        username: variables.admin.username,
        password: variables.admin.password
      })
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .that.has.property("token");
        variables.admin.token = r.body.token;
      }));

  it("should get all users", () =>
    request(Server)
      .get("/v1/users")
      .set("Authorization", "bearer " + variables.admin.token)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("array")
          .of.length(2);
      }));

  it("should update and get the user with id 2017000000", () => {
    request(Server)
      .put("/v1/users/2017000000")
      .send({
        name: "new name"
      })
      .expect(204);

    request(Server)
      .get("/v1/users/2017000000")
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .that.has.property("name")
          .equal("new name");
      });
  });

  it("should delete the user with id 2017000000", () => {
    request(Server)
      .delete("/v1/users/2017000000")
      .set("Authorization", "bearer " + variables.admin.token)
      .expect(204);

    request(Server)
      .get("/v1/users/2017000000")
      .expect(404);
  });
});
