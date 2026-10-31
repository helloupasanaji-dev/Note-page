const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 120, default: "Untitled note" },
  content: { type: String, maxlength: 50000, default: "" },
  color: { type: String, enum: ["cream", "sage", "rose", "sky", "lavender"], default: "cream" },
  pinned: { type: Boolean, default: false }
}, { timestamps: true });

const Note = mongoose.models.Note || mongoose.model("Note", noteSchema);
let connectionPromise;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      .then(() => undefined)
      .catch(error => { connectionPromise = null; throw error; });
  }
  return connectionPromise;
}

function sendError(res, error) {
  console.error("Notes API error:", error.message);
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: "Invalid note data" });
  }
  if (error.message === "MONGODB_URI is missing" || mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "MongoDB is unavailable. Check the MONGODB_URI environment variable and Atlas network access." });
  }
  return res.status(500).json({ error: "Unable to complete the notes request." });
}

async function withDatabase(res, action) {
  try { await connectMongo(); await action(); }
  catch (error) { sendError(res, error); }
}

function listNotes(_req, res) {
  return withDatabase(res, async () => {
    const notes = await Note.find().sort({ pinned: -1, updatedAt: -1 }).lean();
    res.status(200).json(notes);
  });
}
function createNote(req, res) {
  return withDatabase(res, async () => {
    const body = req.body || {};
    const note = await Note.create({
      title: body.title || "Untitled note",
      content: body.content || "",
      color: body.color || "cream",
      pinned: !!body.pinned
    });
    res.status(201).json(note);
  });
}
function updateNote(id, req, res) {
  return withDatabase(res, async () => {
    const allowed = {};
    const body = req.body || {};
    for (const key of ["title", "content", "color", "pinned"]) {
      if (key in body) allowed[key] = body[key];
    }
    const note = await Note.findByIdAndUpdate(id, allowed, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.status(200).json(note);
  });
}
function deleteNote(id, _req, res) {
  return withDatabase(res, async () => {
    const note = await Note.findByIdAndDelete(id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.status(204).end();
  });
}

async function health(_req, res) {
  try { await connectMongo(); res.status(200).json({ connected: true }); }
  catch { res.status(200).json({ connected: false }); }
}

module.exports = { connectMongo, listNotes, createNote, updateNote, deleteNote, health };
