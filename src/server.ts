import { app } from "./app.js";

app.listen(5678, () => {
    console.log(process.env.AUDIENCE)
  console.log(`⚡️[server]: Server is running at http://localhost:5678`);
});