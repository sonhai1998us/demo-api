module.exports = {
	apps: [{
	  name: "staging-api.bookmenow.com.vn",
	  script: "./server.js",
	  env: {
		"NODE_ENV": "development"
	  },
	  env_app: {
		"NODE_ENV": "appdevelopment"
	  },
	  env_staging: {
		"NODE_ENV": "staging"
	  },
	  env_production: {
		"NODE_ENV": "production"
	  }
	}]
  }
