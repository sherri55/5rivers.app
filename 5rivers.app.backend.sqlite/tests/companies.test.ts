import request from "supertest";
import app from "../src/index";

describe("Companies API", () => {
  let createdId: string;
  const testCompany = { name: "Test Company" };

  it("should create a company", async () => {
    const res = await request(app)
      .post("/companies")
      .send(testCompany)
      .expect(201);
    expect(res.body).toHaveProperty("companyId");
    expect(res.body.name).toBe(testCompany.name);
    createdId = res.body.companyId;
  });

  it("should get all companies", async () => {
    const res = await request(app).get("/companies").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get a company by id", async () => {
    const res = await request(app).get(`/companies/${createdId}`).expect(200);
    expect(res.body.companyId).toBe(createdId);
  });

  it("should update a company", async () => {
    const res = await request(app)
      .put(`/companies/${createdId}`)
      .send({ name: "Updated Company" })
      .expect(200);
    expect(res.body.name).toBe("Updated Company");
  });

  it("should delete a company", async () => {
    await request(app).delete(`/companies/${createdId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/companies/${createdId}`).expect(404);
  });
});
