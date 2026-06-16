#!/usr/bin/env node

import { startServer } from "./server.js";

startServer().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
