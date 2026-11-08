import assert from "node:assert/strict";
import test from "node:test";
import { requireStaff } from "./auth.js";

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("staff authorization denies non-staff users", () => {
  const res = responseDouble();
  let continued = false;
  requireStaff({ userRole: "user" }, res, () => {
    continued = true;
  });
  assert.equal(res.statusCode, 403);
  assert.equal(continued, false);
});

test("staff authorization allows staff users", () => {
  const res = responseDouble();
  let continued = false;
  requireStaff({ userRole: "staff" }, res, () => {
    continued = true;
  });
  assert.equal(continued, true);
});
