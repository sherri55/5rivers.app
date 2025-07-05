import request from "supertest";
import app from "../src/index";

describe("Invoices API", () => {
  let dispatcherId: string;
  let jobId1: string;
  let jobId2: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Create a dispatcher
    const dispatcherRes = await request(app).post("/dispatchers").send({
      name: "Test Dispatcher",
      email: "dispatcher@example.com",
      commissionPercent: 10,
    });
    dispatcherId = dispatcherRes.body.dispatcherId;

    // Create jobs for the dispatcher
    const jobRes1 = await request(app).post("/jobs").send({
      name: "Job 1",
      jobDate: new Date().toISOString(),
      dispatchType: "TypeA",
      jobGrossAmount: 100,
      dispatcherId,
    });
    jobId1 = jobRes1.body.jobId;

    const jobRes2 = await request(app).post("/jobs").send({
      name: "Job 2",
      jobDate: new Date().toISOString(),
      dispatchType: "TypeA",
      jobGrossAmount: 200,
      dispatcherId,
    });
    jobId2 = jobRes2.body.jobId;
  });

  afterAll(async () => {
    // Clean up: delete invoice, jobs, dispatcher
    if (invoiceId) await request(app).delete(`/invoices/${invoiceId}`);
    if (jobId1) await request(app).delete(`/jobs/${jobId1}`);
    if (jobId2) await request(app).delete(`/jobs/${jobId2}`);
    if (dispatcherId) await request(app).delete(`/dispatchers/${dispatcherId}`);
  });

  it("should create an invoice with jobs and calculate fields", async () => {
    const res = await request(app)
      .post("/invoices")
      .send({
        invoiceNumber: "INV-NEW-001",
        invoiceDate: new Date().toISOString(),
        billedTo: "Test Client",
        billedEmail: "test@example.com",
        jobIds: [jobId1, jobId2],
      })
      .expect(201);
    expect(res.body).toHaveProperty("invoiceId");
    expect(res.body.invoiceNumber).toBe("INV-NEW-001");
    expect(res.body.subTotal).toBeCloseTo(300);
    expect(res.body.commission).toBeCloseTo(30); // 10% of 300
    expect(res.body.hst).toBeCloseTo((300 + 30) * 0.13);
    expect(res.body.total).toBeCloseTo(300 + 30 + (300 + 30) * 0.13);
    expect(res.body.jobs.length).toBe(2);
    invoiceId = res.body.invoiceId;
  });

  it("should update the invoice with only one job and recalculate fields", async () => {
    const res = await request(app)
      .put(`/invoices/${invoiceId}`)
      .send({
        invoiceNumber: "INV-NEW-001",
        invoiceDate: new Date().toISOString(),
        billedTo: "Test Client Updated",
        billedEmail: "test@example.com",
        jobIds: [jobId2],
      })
      .expect(200);
    expect(res.body.jobs.length).toBe(1);
    expect(res.body.subTotal).toBeCloseTo(200);
    expect(res.body.commission).toBeCloseTo(20); // 10% of 200
    expect(res.body.hst).toBeCloseTo((200 + 20) * 0.13);
    expect(res.body.total).toBeCloseTo(200 + 20 + (200 + 20) * 0.13);
    expect(res.body.billedTo).toBe("Test Client Updated");
  });

  it("should get all invoices", async () => {
    const res = await request(app).get("/invoices").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get an invoice by id", async () => {
    const res = await request(app).get(`/invoices/${invoiceId}`).expect(200);
    expect(res.body.invoiceId).toBe(invoiceId);
  });

  it("should delete the invoice", async () => {
    await request(app).delete(`/invoices/${invoiceId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/invoices/${invoiceId}`).expect(404);
    invoiceId = "undefined";
  });
});
