import express from "express";
import { matchRouter } from "./routes/match.js";

const app = express();
const port = 6666;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

// app routes
app.use("/matches", matchRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
