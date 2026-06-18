const request = require("supertest");
const app = require("../server");
const jwt = require("jsonwebtoken");

const token = jwt.sign(
  { userId: "test-user" },
  process.env.JWT_SECRET
);

describe("API", () => {

  test("GET / should return 200", async () => {

    const response = await request(app).get("/");

    expect(response.statusCode).toBe(200);
  });

});

describe("Auth middleware", () => {

  test("GET /me without token should return 401", async () => {

    const response = await request(app)
      .get("/me");

    expect(response.statusCode).toBe(401);

  });

});
test("GET /me with invalid token should return 401", async () => {

  const response = await request(app)
    .get("/me")
    .set("Authorization", "Bearer invalidtoken");

  expect(response.statusCode).toBe(401);

});

describe("Review route validation", () => {

  test("Missing repoUrl should return 400", async () => {

    const response = await request(app)
      .post("/review")
      .set("Authorization", `Bearer ${token}`)
      .send({
        filePath: "app.js"
      });

    expect(response.statusCode).toBe(400);

  });

});

test("Missing filePath should return 400", async () => {

  const response = await request(app)
    .post("/review")
    .set("Authorization", `Bearer ${token}`)
    .send({
      repoUrl: "https://github.com/test/repo"
    });

  expect(response.statusCode).toBe(400);

});

test("Invalid repo URL should return 400", async () => {

  const response = await request(app)
    .post("/review")
    .set("Authorization", `Bearer ${token}`)
    .send({
      repoUrl: "https://google.com",
      filePath: "app.js"
    });

  expect(response.statusCode).toBe(400);

});