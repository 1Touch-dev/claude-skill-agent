const { buildApp } = require('./app');
const githubPoller = require('./jobs/github-poller');

const app = buildApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
  // Start background jobs after server is listening
  githubPoller.start();
});
