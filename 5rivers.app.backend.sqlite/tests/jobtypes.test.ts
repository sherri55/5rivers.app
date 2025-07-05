import request from "supertest";
import app from "../src/index";

describe("JobTypes API", () => {
  let createdId: string;
  // You may need to provide a valid companyId for jobType
  const testJobType = {
    title: "Test JobType",
    dispatchType: "Hourly",
    startLocation: "A",
    endLocation: "B",
    rateOfJob: 100,
    companyId: "",
  };

  beforeAll(async () => {
    // Create a company and assign its ID to testJobType.companyId
    // ...
  });

  it("should create a jobtype", async () => {
    const res = await request(app)
      .post("/jobtypes")
      .send(testJobType)
      .expect(201);
    expect(res.body).toHaveProperty("jobTypeId");
    expect(res.body.title).toBe(testJobType.title);
    createdId = res.body.jobTypeId;
  });

  it("should get all jobtypes", async () => {
    const res = await request(app).get("/jobtypes").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get a jobtype by id", async () => {
    const res = await request(app).get(`/jobtypes/${createdId}`).expect(200);
    expect(res.body.jobTypeId).toBe(createdId);
  });

  it("should update a jobtype", async () => {
    const res = await request(app)
      .put(`/jobtypes/${createdId}`)
      .send({ title: "Updated JobType" })
      .expect(200);
    expect(res.body.title).toBe("Updated JobType");
  });

  it("should delete a jobtype", async () => {
    await request(app).delete(`/jobtypes/${createdId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/jobtypes/${createdId}`).expect(404);
  });
});
