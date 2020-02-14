import "mocha";
import request from "supertest";
import { expect } from "chai";
import Server from "../src/app";
import variables from "./variables";

describe("Users", () => {
  it("Add a new user", () =>
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

  it("Log in", () =>
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

  it("Get Token", () =>
    request(Server)
      .get("/v1/users/token/application?id=2017000000")
      .set("Authorization", "bearer " + variables.admin.token)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .that.has.property("token");
        variables.publicToken = r.body.token;
      }));

  it("Get Token again", () =>
    request(Server)
      .get("/v1/users/token/application?id=2017000000")
      .set("Authorization", "bearer " + variables.publicToken)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .that.has.property("token");
        variables.publicToken = r.body.token;
      }));

  it("Validate Token", () =>
    request(Server)
      .get(`/v1/users/token/validation?token=${variables.publicToken}`)
      .expect(200)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .that.has.property("id");
        expect(r.body).has.property("public");
        expect(r.body.public).equals(true);
      }));

  it("Get all users", () =>
    request(Server)
      .get("/v1/users")
      .set("Authorization", "bearer " + variables.admin.token)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("array")
          .of.length(2);
      }));

  it("get the user with id 2017000000", () =>
    request(Server)
      .get("/v1/users/2017000000")
      .set("Authorization", "bearer " + variables.publicToken)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .has.property("id");
        expect(r.body.id).to.be.equals(2017000000);
      }));

  it("Update and get the user with id 2017000000", () =>
    request(Server)
      .put("/v1/users/2017000000")
      .set("Authorization", "bearer " + variables.admin.token)
      .send({
        name: "new name"
      })
      .expect(204)
      .then(r =>
        request(Server)
          .get(r.header.location)
          .set("Authorization", "bearer " + variables.admin.token)
          .expect("Content-Type", /json/)
          .then(r => {
            expect(r.body)
              .to.be.an("object")
              .that.has.property("name")
              .equal("new name");
          })
      ));

  it("Delete the user with id 2017000000", () =>
    request(Server)
      .delete("/v1/users/2017000000")
      .set("Authorization", "bearer " + variables.admin.token)
      .expect(204)
      .then(() =>
        request(Server)
          .get("/v1/users/2017000000")
          .set("Authorization", "bearer " + variables.admin.token)
          .expect(404)
      ));
});
