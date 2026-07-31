module.exports = {
  apps: [
    {
      name: 'nexus-engine',
      script: 'src/bot/index.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
