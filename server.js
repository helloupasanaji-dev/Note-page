require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({ limit: "100kb" }));
const showcasePage = path.join(__dirname, "public", "showcase", "index.html");
const notesPage = path.join(__dirname, "public", "notes.html");
app.get("/", (_req, res) => res.sendFile(showcasePage));
app.get(["/showcase", "/showcase/", "/showcase/index.html"], (_req, res) => res.sendFile(showcasePage));
app.get(["/notes", "/notes/", "/notes.html", "/notes/index.html"], (_req, res) => res.sendFile(notesPage));
app.use(express.static(path.join(__dirname, "public")));

const noteSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 120, default: "Untitled note" },
  content: { type: String, maxlength: 50000, default: "" },
  color: { type: String, enum: ["cream", "sage", "rose", "sky", "lavender"], default: "cream" },
  pinned: { type: Boolean, default: false }
}, { timestamps: true });
const Note = mongoose.model("Note", noteSchema);

function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }
let mongoConnectPromise = null;
function connectMongo() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!process.env.MONGODB_URI) return Promise.reject(new Error("MONGODB_URI is missing"));
  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then(() => undefined)
      .catch(error => { mongoConnectPromise = null; throw error; });
  }
  return mongoConnectPromise;
}
app.get("/api/health", (_req, res) => res.json({ connected: mongoose.connection.readyState === 1 }));
app.use("/api/notes", async (_req, res, next) => {
  try { await connectMongo(); next(); }
  catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({ error: "MongoDB is unavailable. Try again shortly." });
  }
});
app.get("/api/notes", asyncRoute(async (_req, res) => {
  const notes = await Note.find().sort({ pinned: -1, updatedAt: -1 }).lean();
  res.json(notes);
}));
app.post("/api/notes", asyncRoute(async (req, res) => {
  const note = await Note.create({ title: req.body.title || "Untitled note", content: req.body.content || "", color: req.body.color || "cream", pinned: !!req.body.pinned });
  res.status(201).json(note);
}));
app.patch("/api/notes/:id", asyncRoute(async (req, res) => {
  const allowed = {};
  for (const key of ["title", "content", "color", "pinned"]) if (key in req.body) allowed[key] = req.body[key];
  const note = await Note.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
}));
app.delete("/api/notes/:id", asyncRoute(async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.status(204).end();
}));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ error: "Invalid note data" });
  res.status(500).json({ error: "Something went wrong. Check the server connection." });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Notepad is ready at http://localhost:${port}`));
  const connectWithRetry = () => connectMongo()
    .then(() => console.log("Connected to MongoDB Atlas"))
    .catch(error => {
      console.error("MongoDB connection failed; retrying in 30 seconds:", error.message);
      const retry = setTimeout(connectWithRetry, 30000);
      retry.unref();
    });
  connectWithRetry();
}
module.exports = app;
