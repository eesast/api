import "mocha";
import request from "supertest";
import { expect } from "chai";
import Server from "../src/app";
import variables from "./variables";

describe("Tracks", () => {
  it("Create a new track", () =>
    request(Server)
      .post("/v1/tracks")
      .set("Authorization", "bearer " + variables.admin.token)
      .send({
        name: "testTrack",
        description: "A test Track",
        year: 2020,
        open: false
      })
      .expect(201));

  it("Get all tracks", () =>
    request(Server)
      .get("/v1/tracks")
      .set("Authorization", "bearer " + variables.admin.token)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("array")
          .of.length(1);
        expect(r.body[0])
          .to.be.an("object")
          .that.has.property("id");
        variables.trackId = r.body[0].id;
      }));

  it("Join a track but failed", () =>
    request(Server)
      .post(`/v1/tracks/${variables.trackId}/registration`)
      .set("Authorization", "bearer " + variables.user.token)
      .send({
        userId: 2018000000
      })
      .expect(403));

  it("Update track", () =>
    request(Server)
      .put(`/v1/tracks/${variables.trackId}`)
      .set("Authorization", "bearer " + variables.admin.token)
      .send({
        open: true
      })
      .expect(204));

  it("Join a track and success", () =>
    request(Server)
      .post(`/v1/tracks/${variables.trackId}/registration`)
      .set("Authorization", "bearer " + variables.user.token)
      .send({
        userId: 2018000000
      })
      .expect(204));

  it("Check player", () =>
    request(Server)
      .get(`/v1/tracks/${variables.trackId}?playerInfo=true`)
      .set("Authorization", "bearer " + variables.admin.token)
      .expect("Content-Type", /json/)
      .then(r => {
        expect(r.body)
          .to.be.an("object")
          .that.has.property("player");
        expect(r.body.player)
          .to.be.a("array")
          .of.length(1);
      }));

  it("Join a track and failed by rejoin", () =>
    request(Server)
      .post(`/v1/tracks/${variables.trackId}/registration`)
      .set("Authorization", "bearer " + variables.user.token)
      .send({
        userId: 2018000000
      })
      .expect(409));

  it("Exit a track and success", () =>
    request(Server)
      .delete(`/v1/tracks/${variables.trackId}/registration/2018000000`)
      .set("Authorization", "bearer " + variables.user.token)
      .expect(204));

  it("Delete the track", () =>
    request(Server)
      .delete(`/v1/tracks/${variables.trackId}`)
      .set("Authorization", "bearer " + variables.admin.token)
      .expect(204)
      .then(() =>
        request(Server)
          .get(`/v1/tracks/${variables.trackId}`)
          .set("Authorization", "bearer " + variables.admin.token)
          .expect(404)
      ));
});
