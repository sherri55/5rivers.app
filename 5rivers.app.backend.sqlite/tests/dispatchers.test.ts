import request from "supertest";
import app from "../src/index";

describe("Dispatchers API", () => {
  let createdId: string;
  const testDispatcher = { name: "Test Dispatcher", commission: 10 };

  it("should create a dispatcher", async () => {
    const res = await request(app)
      .post("/dispatchers")
      .send(testDispatcher)
      .expect(201);
    expect(res.body).toHaveProperty("dispatcherId");
    expect(res.body.name).toBe(testDispatcher.name);
    createdId = res.body.dispatcherId;
  });

  it("should get all dispatchers", async () => {
    const res = await request(app).get("/dispatchers").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should get a dispatcher by id", async () => {
    const res = await request(app).get(`/dispatchers/${createdId}`).expect(200);
    expect(res.body.dispatcherId).toBe(createdId);
  });

  it("should update a dispatcher", async () => {
    const res = await request(app)
      .put(`/dispatchers/${createdId}`)
      .send({ name: "Updated Dispatcher", commission: 15 })
      .expect(200);
    expect(res.body.name).toBe("Updated Dispatcher");
    expect(res.body.commission).toBe(15);
  });

  it("should delete a dispatcher", async () => {
    await request(app).delete(`/dispatchers/${createdId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/dispatchers/${createdId}`).expect(404);
  });
});
