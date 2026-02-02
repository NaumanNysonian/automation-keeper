module.exports = {
  apps: [
    {
      name: "automation-keeper",
      cwd: "/var/www/html/automation-keeper",
      script: "server.js",

      exec_mode: "fork",   // 👈 FORCE fork
      instances: 1,        // 👈 must be 1 for fork

      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      env: {
        NODE_ENV: "production",
        PORT: "3007",
        HOST: "automation-keeper.nysonik.com"
      }
    }
  ]
};

