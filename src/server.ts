import app from './app.js';

const PORT = process.env.PORT || 5678;

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
