import request from "supertest";
import app from "../src/index";

describe("Jobs API", () => {
  let createdId: string;
  // You may need to provide valid IDs for related entities (jobTypeId, driverId, dispatcherId, unitId)
  // For a real test, you should create these dependencies or mock them
  const testJob = {
    title: "Test Job",
    dateOfJob: new Date().toISOString().slice(0, 10),
    dispatchType: "Hourly",
    jobTypeId: "",
    driverId: "",
    dispatcherId: "",
    unitId: "",
    startTimeForJob: "08:00",
    endTimeForJob: "12:00",
    startTimeForDriver: "08:00",
    endTimeForDriver: "12:00",
    invoiceStatus: "Pending",
  };

  beforeAll(async () => {
    // Create dependencies (jobType, driver, dispatcher, unit) and assign their IDs to testJob
    // ...
  });

  it("should create a job", async () => {
    const res = await request(app).post("/jobs").send(testJob).expect(201);
    expect(res.body).toHaveProperty("jobId");
    expect(res.body.title).toBe(testJob.title);
    createdId = res.body.jobId;
  });

  it("should get all jobs", async () => {
    const res = await request(app).get("/jobs").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get a job by id", async () => {
    const res = await request(app).get(`/jobs/${createdId}`).expect(200);
    expect(res.body.jobId).toBe(createdId);
  });

  it("should update a job", async () => {
    const res = await request(app)
      .put(`/jobs/${createdId}`)
      .send({ title: "Updated Job" })
      .expect(200);
    expect(res.body.title).toBe("Updated Job");
  });

  it("should delete a job", async () => {
    await request(app).delete(`/jobs/${createdId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/jobs/${createdId}`).expect(404);
  });
});
