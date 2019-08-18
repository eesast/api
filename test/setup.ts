import * as bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import "mocha";
import User from "../src/models/user";
import variables from "./variables";

dotenv.config();

before("Set up the database for testing", function(done) {
  this.timeout(15000);

  if (process.env.CI) {
    mongoose.connect(`mongodb://localhost:27017/sast-api-test`, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      user: "travis",
      pass: "test"
    });
  } else {
    mongoose.connect(
      `mongodb://localhost:27017/sast-api-test?authSource=admin`,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        user: process.env.DB_USER,
        pass: process.env.DB_PASS
      }
    );
  }

  const db = mongoose.connection;
  db.once("open", async () => {
    await db.dropDatabase();
    done();
  });
});

before("Create admin user", async function() {
  this.timeout(10000);

  const admin = new User({
    id: 0,
    username: variables.admin.username,
    password: await bcrypt.hash(variables.admin.password, variables.saltRounds),
    email: "admin@eesast.com",
    name: "admin",
    phone: 0,
    department: "电子系",
    class: "无00",
    group: "admin",
    role: "root"
  });

  return Promise.resolve(admin.save());
});
