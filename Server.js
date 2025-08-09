import express from "express";

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  console.log("Root endpoint hit");
  res.send("Root is working!");
});

app.get("/api", (req, res) => {
  res.send("API is working!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
