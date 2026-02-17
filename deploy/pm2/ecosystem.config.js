module.exports = {
  apps: [
    {
      name: 'pillow-ai',
      cwd: '/root/pillow_ai',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
