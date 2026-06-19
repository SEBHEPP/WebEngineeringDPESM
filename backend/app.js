const path = require("path");
const express = require("express");
const cors = require("cors");

const apiRoutes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFoundHandler = require("./middlewares/notFoundHandler");

const app = express();
const frontendPath = path.join(__dirname, "../frontend");

app.use(cors());
app.use(express.json());

app.use(express.static(frontendPath));

app.use("/api", apiRoutes);
app.use("/api", notFoundHandler);

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(errorHandler);

module.exports = app;
