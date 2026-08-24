const ANNOUNCE_INTERVAL_MS = 86_400_000;
const RETRY_INTERVAL_MS = 30_000;

export class SupervisorDiscovery {
  constructor({ credentials, port, logger, environment = process.env }) {
    this.credentials = credentials;
    this.port = port;
    this.logger = logger;
    this.environment = environment;
    this.stopped = false;
    this.timer = undefined;
  }

  start() {
    if (!this.environment.SUPERVISOR_TOKEN || !this.environment.HOSTNAME) {
      this.logger.info("Supervisor discovery unavailable outside a Home Assistant App");
      return;
    }
    void this.#announce();
  }

  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  async #announce() {
    let delay = ANNOUNCE_INTERVAL_MS;
    try {
      const response = await fetch("http://supervisor/discovery", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.environment.SUPERVISOR_TOKEN}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          service: "opendisplay_studio_renderer",
          config: {
            host: this.environment.HOSTNAME,
            port: this.port,
            auth_token: this.credentials.authToken,
            instance_id: this.credentials.instanceId,
            api_version: 1
          }
        })
      });
      if (!response.ok) {
        throw new Error(`Supervisor returned HTTP ${response.status}`);
      }
      this.logger.info(
        { host: this.environment.HOSTNAME, port: this.port },
        "Announced renderer through Supervisor discovery"
      );
    } catch (error) {
      delay = RETRY_INTERVAL_MS;
      this.logger.warn({ error }, "Supervisor discovery failed; retrying");
    }
    if (!this.stopped) {
      this.timer = setTimeout(() => void this.#announce(), delay);
      this.timer.unref();
    }
  }
}
