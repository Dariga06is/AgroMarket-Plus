# AgroMarket Plus 3.3 — Farmer Studio

## Іске қосу
1. Open `AgroMarket_Plus_3.3_FarmerStudio` in VS Code.
2. Run `node server.js`. Open http://localhost:3001. If port 3001 is busy, stop the earlier server first.
3. Registration role `admin` requires code `879898` in this local demo. It is validated on the server and loaded from `.env`.
4. Customer sees catalog, cart and own orders; farmer sees only owned products/orders, incoming orders and analytics; admin sees platform controls.
5. Farmer: click `Қабылдау`, `Дайындау`, `Жолға жіберу`, `Жеткізілді`; use `+5 қор` to replenish stock.

## Security
The six-digit shared code is **not suitable for a public internet deployment**. For production replace it with invitation tokens, MFA and enforced admin approval. Rotate the code after use. `.env` must remain private. This ZIP includes the demo code requested but **no Gmail password**.

## Note
Products imported from the original archive have no `farmerId` and are owned by the platform admin. To test farmer orders, log in as farmer, create a new product, log out, sign in as customer and buy it. Farmer will see the order.
