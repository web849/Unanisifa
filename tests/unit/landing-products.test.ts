import test from "node:test";
import assert from "node:assert/strict";
import { getLandingCatalog, toLandingOrderProduct } from "../../lib/landing/products";

test("without a database the builder gets the demo catalog, public pages do not", async () => {
  const demo = await getLandingCatalog({ demoFallback: true });
  assert.equal(demo.demoFallback, true);
  assert.equal(demo.databaseCount, 0);
  assert.equal(demo.items.length, 16);
  assert.ok(demo.items.every((product) => product.isDemo));
  const safajin = demo.items.find((product) => product.slug === "safajin-safa-ambari");
  assert.ok(safajin);
  assert.equal(safajin.name, "Safajin + Safa Ambari");
  assert.equal(safajin.price, 1000);
  assert.equal(
    safajin.image,
    "https://prakritirshifa.com/wp-content/uploads/2026/04/ChatGPT-Image-Apr-20-2026-01_35_29-AM-683x1024.png",
  );

  const publicCatalog = await getLandingCatalog();
  assert.equal(publicCatalog.demoFallback, false);
  assert.equal(publicCatalog.items.length, 0);
});

test("landing product converts to the order-form contract", async () => {
  const { items } = await getLandingCatalog({ demoFallback: true });
  const product = items[0];
  assert.ok(product);
  const orderProduct = toLandingOrderProduct(product);
  assert.equal(orderProduct.id, product.id);
  assert.equal(orderProduct.name, product.name);
  assert.equal(orderProduct.price, product.price);
  assert.equal(orderProduct.unitSize, product.packageSize);
  assert.equal(orderProduct.inStock, product.inStock);
  assert.equal(orderProduct.requiresPrescription, product.requiresPrescription);
});
