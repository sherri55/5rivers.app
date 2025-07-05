import request from "supertest";
import app from "../src/index";

describe("Units API", () => {
  let createdId: string;
  const testUnit = { name: "Test Unit" };

  it("should create a unit", async () => {
    const res = await request(app).post("/units").send(testUnit).expect(201);
    expect(res.body).toHaveProperty("unitId");
    expect(res.body.name).toBe(testUnit.name);
    createdId = res.body.unitId;
  });

  it("should get all units", async () => {
    const res = await request(app).get("/units").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get a unit by id", async () => {
    const res = await request(app).get(`/units/${createdId}`).expect(200);
    expect(res.body.unitId).toBe(createdId);
  });

  it("should update a unit", async () => {
    const res = await request(app)
      .put(`/units/${createdId}`)
      .send({ name: "Updated Unit" })
      .expect(200);
    expect(res.body.name).toBe("Updated Unit");
  });

  it("should delete a unit", async () => {
    await request(app).delete(`/units/${createdId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/units/${createdId}`).expect(404);
  });
});
