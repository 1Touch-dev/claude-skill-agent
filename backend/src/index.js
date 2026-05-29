const { buildApp } = require('./app');
const app = buildApp();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend running on port ${port}`));
